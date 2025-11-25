import { prisma } from "@tracking/shared";
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
});

const SLOW_QUERY_THRESHOLD_MS = 1000; // 1 second

interface QueryStats {
  query: string;
  avgDuration: number;
  maxDuration: number;
  count: number;
  table: string;
}

async function analyzeSlowQueries(): Promise<void> {
  logger.info("Starting slow query analysis...");

  try {
    // Get slow queries from PostgreSQL
    const slowQueries = await prisma.$queryRaw<Array<{
      query: string;
      mean_exec_time: number;
      max_exec_time: number;
      calls: number;
    }>>`
      SELECT 
        query,
        mean_exec_time,
        max_exec_time,
        calls
      FROM pg_stat_statements
      WHERE mean_exec_time > ${SLOW_QUERY_THRESHOLD_MS}
      ORDER BY mean_exec_time DESC
      LIMIT 20
    `;

    if (slowQueries.length === 0) {
      logger.info("No slow queries detected");
      return;
    }

    logger.warn(`Found ${slowQueries.length} slow queries`);

    for (const query of slowQueries) {
      logger.warn({
        query: query.query.substring(0, 200),
        avgDuration: query.mean_exec_time,
        maxDuration: query.max_exec_time,
        calls: query.calls,
      }, "Slow query detected");

      // Suggest indexes
      const suggestions = suggestIndexes(query.query);
      if (suggestions.length > 0) {
        logger.info({ suggestions }, "Suggested indexes");
      }
    }
  } catch (error) {
    // pg_stat_statements might not be enabled
    logger.warn("pg_stat_statements not available, skipping slow query analysis");
  }
}

function suggestIndexes(query: string): string[] {
  const suggestions: string[] = [];

  // Detect WHERE clauses
  const whereMatches = query.match(/WHERE\s+(\w+)\s*=/gi);
  if (whereMatches) {
    for (const match of whereMatches) {
      const column = match.match(/(\w+)\s*=/i)?.[1];
      if (column) {
        suggestions.push(`CREATE INDEX IF NOT EXISTS idx_${column} ON table_name(${column});`);
      }
    }
  }

  // Detect JOIN clauses
  const joinMatches = query.match(/JOIN\s+\w+\s+ON\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/gi);
  if (joinMatches) {
    for (const match of joinMatches) {
      const parts = match.match(/(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/i);
      if (parts) {
        const [, table1, col1, table2, col2] = parts;
        suggestions.push(`CREATE INDEX IF NOT EXISTS idx_${table1}_${col1} ON ${table1}(${col1});`);
        suggestions.push(`CREATE INDEX IF NOT EXISTS idx_${table2}_${col2} ON ${table2}(${col2});`);
      }
    }
  }

  return suggestions;
}

async function checkTableSizes(): Promise<void> {
  logger.info("Checking table sizes...");

  const tables = await prisma.$queryRaw<Array<{
    table_name: string;
    row_count: number;
    total_size: string;
  }>>`
    SELECT 
      schemaname || '.' || tablename AS table_name,
      n_live_tup AS row_count,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size
    FROM pg_stat_user_tables
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    LIMIT 10
  `;

  for (const table of tables) {
    logger.info({
      table: table.table_name,
      rows: table.row_count,
      size: table.total_size,
    }, "Table stats");
  }
}

async function checkMissingIndexes(): Promise<void> {
  logger.info("Checking for missing indexes...");

  // Check for foreign keys without indexes
  const missingIndexes = await prisma.$queryRaw<Array<{
    table_name: string;
    column_name: string;
  }>>`
    SELECT
      tc.table_name,
      kcu.column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = tc.table_name
          AND indexdef LIKE '%' || kcu.column_name || '%'
      )
    LIMIT 20
  `;

  if (missingIndexes.length > 0) {
    logger.warn({ missingIndexes }, "Foreign keys without indexes detected");
  } else {
    logger.info("All foreign keys have indexes");
  }
}

async function main(): Promise<void> {
  logger.info("Starting database monitoring worker...");

  const interval = parseInt(process.env.MONITORING_INTERVAL_MS || "3600000", 10); // Default 1 hour

  // Run immediately
  await analyzeSlowQueries();
  await checkTableSizes();
  await checkMissingIndexes();

  // Then run on interval
  setInterval(async () => {
    await analyzeSlowQueries();
    await checkTableSizes();
    await checkMissingIndexes();
  }, interval);

  logger.info(`Monitoring worker started, running every ${interval}ms`);
}

main().catch((error) => {
  logger.error(error, "Worker failed");
  process.exit(1);
});



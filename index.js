require('./src/server').start().catch((err) => {
  console.error('Fatal error starting notification service:', err);
  process.exit(1);
});

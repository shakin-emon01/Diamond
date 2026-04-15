const cluster = require("cluster");
const os = require("os");

const WORKER_COUNT = parseInt(process.env.CLUSTER_WORKERS, 10) || Math.min(os.cpus().length, 4);

if (cluster.isPrimary) {
  console.log(`  [diamond-backend] Primary process ${process.pid} starting ${WORKER_COUNT} workers...`);

  for (let i = 0; i < WORKER_COUNT; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code) => {
    console.log(`  [diamond-backend] Worker ${worker.process.pid} exited (code ${code}). Restarting...`);
    cluster.fork();
  });
} else {
  require("./server");
}

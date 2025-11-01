const { spawn } = require("child_process");
const fs = require('fs');

// 定义应用列表
const apps = [
  {
    name: "xy",
    binaryPath: "/home/container/xy/xy",
    args: ["-c", "/home/container/xy/config.json"]
  },
  {
    name: "h2",
    binaryPath: "/home/container/h2/h2", 
    args: ["server", "-c", "/home/container/h2/config.yaml"]
  }
];

// 如果哪吒监控的配置文件存在，则加入启动列表
if (fs.existsSync("/home/container/nz/config.yaml")) {
  apps.push({
    name: "nz",
    binaryPath: "/home/container/nz/nz",
    args: ["-c", "/home/container/nz/config.yaml"]
  });
}

function runProcess(app) {
  const child = spawn(app.binaryPath, app.args, { stdio: "inherit" });

  child.on("exit", (code) => {
    console.log(`[EXIT] ${app.name} exited with code: ${code}`);
    
    if (app.name === "nz" && code !== 0) {
      console.log(`[NZ FIX] Checking Nezha config...`);
      const configPath = "/home/container/nz/config.yaml";
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        if (!content.includes(`secret: ${process.env.NZ_CLIENT_SECRET}`)) {
          console.log(`[NZ FIX] Recreating config with correct secret...`);
          const tlsValue = process.env.NZ_TLS === "true" ? "true" : "false";
          fs.writeFileSync(configPath, `server: ${process.env.NZ_SERVER}\nsecret: ${process.env.NZ_CLIENT_SECRET}\ntls: ${tlsValue}\n`);
        }
      }
    }
    
    console.log(`[RESTART] Restarting ${app.name}...`);
    setTimeout(() => runProcess(app), 3000);
  });
}

function main() {
  try {
    for (const app of apps) {
      runProcess(app);
    }
  } catch (err) {
    console.error("[ERROR] Startup failed:", err);
    process.exit(1);
  }
}

main();

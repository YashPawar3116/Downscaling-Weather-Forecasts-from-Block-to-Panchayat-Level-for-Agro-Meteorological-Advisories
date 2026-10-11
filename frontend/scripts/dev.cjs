const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

const port = process.env.PORT || '8001';
const apiUrl = `http://127.0.0.1:${port}/healthz`;
const frontendDir = path.resolve(__dirname, '..');
let api;
let vite;
let apiStartupError;

function isApiReady() {
  return new Promise((resolve) => {
    const request = http.get(apiUrl, (response) => {
      request.setTimeout(0);
      response.resume();
      response.on('end', () => resolve(response.statusCode === 200));
    });
    request.setTimeout(2000, () => { request.destroy(); resolve(false); });
    request.on('error', () => resolve(false));
  });
}

async function waitForApi() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await isApiReady()) return true;
    if (apiStartupError || (api && api.exitCode !== null)) return false;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

function stop() {
  if (vite && !vite.killed) vite.kill();
  if (api && !api.killed) api.kill();
}

async function main() {
  if (!(await isApiReady())) {
    const python = process.env.PYTHON || (process.platform === 'win32' ? 'py' : 'python3');
    const pythonArgs = process.env.PYTHON ? [] : (process.platform === 'win32' ? ['-3'] : []);
    api = spawn(python, [...pythonArgs, 'server.py'], {
      cwd: frontendDir,
      stdio: 'inherit',
      env: { ...process.env, PORT: port },
    });
    api.on('error', (error) => { apiStartupError = error; });
    if (!(await waitForApi())) {
      stop();
      console.error(`The forecast API did not become ready at ${apiUrl}. Check that Python is installed and that the API port is available.`);
      if (apiStartupError) console.error(`Could not start the API process: ${apiStartupError.message}`);
      process.exitCode = 1;
      return;
    }
  }
  vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js'], { cwd: frontendDir, stdio: 'inherit' });
  vite.on('error', (error) => {
    console.error(`Could not start Vite: ${error.message}`);
    stop();
    process.exitCode = 1;
  });
  vite.on('exit', (code) => { stop(); process.exitCode = code ?? 0; });
  if (api) {
    api.on('exit', (code) => {
      if (vite && vite.exitCode === null) {
        console.error(`The forecast API stopped unexpectedly (exit code ${code ?? 'unknown'}). Stopping Vite to avoid repeated proxy connection errors.`);
        vite.kill();
        process.exitCode = 1;
      }
    });
  }
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
main();

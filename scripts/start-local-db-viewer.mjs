import { randomBytes } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const credentialsPath = resolve(projectRoot, 'data/local-ops/db-viewer.env');

function validateCredentials(filePath) {
  const stat = lstatSync(filePath);
  if (!stat.isFile() || stat.isSymbolicLink())
    throw new Error('O arquivo de credenciais local precisa ser um arquivo regular.');
  const contents = readFileSync(filePath, 'utf8');
  if (!/^DB_VIEWER_PASSWORD=[A-Za-z0-9_-]{40,100}\r?\n?$/.test(contents))
    throw new Error('O arquivo de credenciais local está inválido; ele não foi alterado.');
}

function restrictCredentials(filePath, platform = process.platform) {
  if (platform === 'win32') {
    const principal = execFileSync('whoami.exe', [], { encoding: 'utf8' }).trim();
    execFileSync('icacls.exe', [filePath, '/inheritance:r', '/grant:r', `${principal}:(R,W)`], {
      stdio: 'ignore',
    });
    return;
  }
  chmodSync(filePath, 0o600);
}

export function ensureCredentials(filePath, options = {}) {
  mkdirSync(dirname(filePath), { recursive: true });
  if (existsSync(filePath)) validateCredentials(filePath);
  else {
    const password = randomBytes(36).toString('base64url');
    try {
      writeFileSync(filePath, `DB_VIEWER_PASSWORD=${password}\n`, {
        encoding: 'utf8',
        flag: 'wx',
        mode: 0o600,
      });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST')
        validateCredentials(filePath);
      else throw error;
    }
  }
  restrictCredentials(filePath, options.platform);
  validateCredentials(filePath);
  return readFileSync(filePath, 'utf8').slice('DB_VIEWER_PASSWORD='.length).trim();
}

function composeArguments(action, service, command = []) {
  const args = [
    'compose',
    '-f',
    'docker-compose.yml',
    '-f',
    'docker-compose.local-db-viewer.yml',
    '-f',
    'docker-compose.local-observability.yml',
    '--profile',
    'local-db-viewer',
  ];
  if (action === 'up') return [...args, 'up', '-d', ...command, service];
  if (action === 'stop') return [...args, 'stop', service];
  const [options, ...commandArgs] = command;
  return [...args, 'exec', options, service, ...commandArgs];
}

export function run(action = 'up') {
  if (action === 'stop') {
    executeDocker(composeArguments('stop', 'adminer'));
    console.log('Adminer local foi parado; os dados e o papel de leitura foram preservados.');
    return;
  }

  const password = ensureCredentials(credentialsPath);
  executeDocker(composeArguments('up', 'postgres', ['--wait']));
  const sqlPath = resolve(projectRoot, 'ops/local-db-viewer/provision-readonly-role.sql');
  const template = readFileSync(sqlPath, 'utf8');
  const sql = template.replace(
    '\\getenv viewer_password DB_VIEWER_PASSWORD',
    `\\set viewer_password '${password}'`,
  );
  if (sql === template) throw new Error('O bootstrap da role local não está configurado.');
  executeDocker(
    composeArguments('exec', 'postgres', [
      '-T',
      'sh',
      '-lc',
      'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"',
    ]),
    { input: sql, redactions: [password] },
  );
  executeDocker(composeArguments('up', 'adminer'));
  console.log('Adminer local: http://localhost:8082');
  console.log('Usuário: bdo_viewer. Senha: arquivo local ignorado data/local-ops/db-viewer.env.');
}

function executeDocker(args, options = {}) {
  const result = spawnSync('docker', args, {
    cwd: projectRoot,
    encoding: 'utf8',
    input: options.input,
  });
  for (const [output, stream] of [
    [result.stdout, process.stdout],
    [result.stderr, process.stderr],
  ]) {
    if (!output) continue;
    let safeOutput = output;
    for (const secret of options.redactions ?? [])
      safeOutput = safeOutput.replaceAll(secret, '[redacted]');
    stream.write(safeOutput);
  }
  if (result.error) throw new Error('Não foi possível executar Docker Compose.');
  if (result.status !== 0)
    throw new Error('Docker Compose falhou; veja o erro acima sem credenciais expostas.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    run(process.argv.includes('--stop') ? 'stop' : 'up');
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : 'Falha ao iniciar o visualizador local.',
    );
    process.exitCode = 1;
  }
}


import chokidar from 'chokidar'
const { name: example } = path.parse(process.cwd())
const exRoot = path.resolve(__dirname, 'examples', example)
const command = process.argv.slice(5)

if (!fs.existsSync(exRoot)) {
  console.log('Must be called from a directory under examples/.')
  process.exit()
}

await $`rm -rf ${exRoot}/node_modules/vite`
await $`rm -rf ${exRoot}/node_modules/.vite`

const template = require(path.join(exRoot, 'package.json'))
const localPackages = fs.readdirSync(path.join(__dirname, 'packages'))

const { external, local } = template
const dependencies = { ...external }

for (const localDep of Object.keys(local)) {
  for (const [dep, version] of Object.entries(
    require(path.join(__dirname, 'packages', localDep, 'package.json')).dependencies)
  ) {
    dependencies[dep] = version
  }
}

await createPackageFile(exRoot, dependencies)
await $`npm install -f`

for (const localDep of Object.keys(local)) {
  await $`cp -r ${__dirname}/packages/${localDep} ${exRoot}/node_modules/${localDep}`
  const changed = (reason) => async (path) => {
    console.log(`ℹ ${reason} ${path}`)
    await $`cp -r ${__dirname}/packages/${localDep} ${exRoot}/node_modules/${localDep}`
  }
  const watcher = chokidar.watch(`${__dirname}/packages/${localDep}`, {
    ignored: [/node_modules/],
    ignoreInitial: true,
  })
  watcher.on('add', changed('A'))
  watcher.on('unlink', changed('D'))
  watcher.on('change', changed('M'))
}

await $`${command}`

async function createPackageFile(exRoot, dependencies) {
  await fs.writeFile(
    path.join(exRoot, 'package.json'),
    JSON.stringify({ ...template, dependencies }, null, 2)
  )
}

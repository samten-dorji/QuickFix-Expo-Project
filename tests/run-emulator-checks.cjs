const { spawnSync } = require('node:child_process');
for (const suite of ['tests/rules.test.cjs','functions/test/provisioning.test.cjs']) {
 const result=spawnSync(process.execPath,['--test',suite],{stdio:'inherit',env:process.env});
 if(result.status!==0)process.exit(result.status??1);
}

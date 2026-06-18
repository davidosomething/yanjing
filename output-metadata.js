const p = require('./package.json');

console.log(
  JSON.stringify(
    {
      KPackageStructure: 'KWin/Script',
      KPlugin: {
        Authors: [
          {
            Email: p.author.email,
            Name: p.author.name,
          },
        ],
        Category: 'Window Management',
        Dependencies: [],
        Description: p.description,
        Icon: 'preferences-system-windows-script-test',
        Id: 'yanjing',
        License: p.license,
        Name: p.name,
        ServiceTypes: ['KWin/Script'],
        Version: p.version,
        Website: p.homepage,
      },
      'X-KDE-ParentComponents': ['yanjing'],
      'X-Plasma-API': 'javascript',
      'X-Plasma-API-Minimum-Version': '6.0',
      'X-Plasma-MainScript': p.main,
    },
    null,
    2,
  ),
);

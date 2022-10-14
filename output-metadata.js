const p = require('./package.json');

console.log(JSON.stringify({
    "KPlugin": {
        "Authors": [
            {
                "Email": p.author.email,
                "Name": p.author.name,
            }
        ],
        "Category": "Window Management",
        "Dependencies": [
        ],
        "Description": p.Description,
        "EnabledByDefault": true,
        "Icon": "preferences-system-windows-script-test",
        "Id": "yanjing",
        "License": p.license,
        "Name": p.name,
        "ServiceTypes": [
            "KWin/Script"
        ],
        "Version": p.version,
        "Website": p.homepage,
    },
    "X-Plasma-API": "javascript",
    "X-Plasma-MainScript": p.main,
}, null, 2));

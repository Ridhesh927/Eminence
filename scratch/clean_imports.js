const fs = require('fs');

const lintOutput = `
  ! eslint(no-unused-vars): Identifier 'setToken' is imported but never used.
   ,-[src/components/Shared/ChatWidget.jsx:5:10]
  ! eslint(no-unused-vars): Identifier 'removeToken' is imported but never used.
   ,-[src/components/Shared/ChatWidget.jsx:5:30]
  ! eslint(no-unused-vars): Identifier 'setToken' is imported but never used.
   ,-[src/components/Customer/ReviewModal.jsx:5:10]
  ! eslint(no-unused-vars): Identifier 'removeToken' is imported but never used.
   ,-[src/components/Customer/ReviewModal.jsx:5:30]
  ! eslint(no-unused-vars): Identifier 'setToken' is imported but never used.
   ,-[src/pages/CompleteProfile.jsx:8:10]
  ! eslint(no-unused-vars): Identifier 'removeToken' is imported but never used.
   ,-[src/pages/CompleteProfile.jsx:8:30]
  ! eslint(no-unused-vars): Identifier 'setToken' is imported but never used.
   ,-[src/components/Tracking/TrackingMap.jsx:6:10]
  ! eslint(no-unused-vars): Identifier 'removeToken' is imported but never used.
   ,-[src/components/Tracking/TrackingMap.jsx:6:30]
  ! eslint(no-unused-vars): Identifier 'setToken' is imported but never used.
   ,-[src/components/Shared/Navbar.jsx:7:10]
  ! eslint(no-unused-vars): Identifier 'getToken' is imported but never used.
   ,-[src/components/Shared/Navbar.jsx:7:20]
  ! eslint(no-unused-vars): Identifier 'getToken' is imported but never used.
   ,-[src/components/Auth/OTPVerification.jsx:7:20]
  ! eslint(no-unused-vars): Identifier 'removeToken' is imported but never used.
   ,-[src/components/Auth/OTPVerification.jsx:7:30]
  ! eslint(no-unused-vars): Identifier 'setToken' is imported but never used.
    ,-[src/components/Customer/CompleteProfileModal.jsx:9:10]
  ! eslint(no-unused-vars): Identifier 'removeToken' is imported but never used.
    ,-[src/components/Customer/CompleteProfileModal.jsx:9:30]
  ! eslint(no-unused-vars): Identifier 'getToken' is imported but never used.
   ,-[src/pages/AdminLogin.jsx:7:20]
  ! eslint(no-unused-vars): Identifier 'removeToken' is imported but never used.
   ,-[src/pages/AdminLogin.jsx:7:30]
  ! eslint(no-unused-vars): Identifier 'getToken' is imported but never used.
    ,-[src/components/Auth/Login.jsx:9:20]
  ! eslint(no-unused-vars): Identifier 'removeToken' is imported but never used.
    ,-[src/components/Auth/Login.jsx:9:30]
`;

const lines = lintOutput.split('\n');
let currentIdentifier = '';

const toFix = {};

for (const line of lines) {
    const idMatch = line.match(/Identifier '(\w+)' is imported but never used/);
    if (idMatch) {
        currentIdentifier = idMatch[1];
    }
    const fileMatch = line.match(/,-\[(src\/[^:]+)/);
    if (fileMatch && currentIdentifier) {
        const file = 'frontend/' + fileMatch[1];
        if (!toFix[file]) toFix[file] = [];
        toFix[file].push(currentIdentifier);
        currentIdentifier = '';
    }
}

for (const [file, identifiers] of Object.entries(toFix)) {
    let content = fs.readFileSync(file, 'utf8');
    for (const id of identifiers) {
        // e.g. import { setToken, getToken, removeToken }
        content = content.replace(new RegExp(`\\s*${id}\\s*,?`), '');
        // handle trailing comma if any
        content = content.replace(/,\s*}/g, ' }');
        // handle leading comma if any
        content = content.replace(/{\s*,/g, '{ ');
        // if `{ }` becomes empty, remove whole import line
        content = content.replace(/import { } from '[^']+';\n?/g, '');
    }
    fs.writeFileSync(file, content);
    console.log(`Cleaned ${file}`);
}

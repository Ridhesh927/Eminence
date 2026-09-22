const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/AdminDashboard.jsx', 'utf8');

if (!content.includes('import api from')) {
    content = content.replace("import axios from 'axios';", "import api from '../services/api';\nimport axios from 'axios';");
}

// Replace API_BASE_URL
content = content.replace(/const API_BASE_URL = .*?;/g, 'const API_BASE_URL = api.defaults.baseURL;');

// Remove template literals API_BASE_URL
content = content.split('${API_BASE_URL}').join('');

// Replace axios calls
content = content.split('axios.get').join('api.get');
content = content.split('axios.post').join('api.post');
content = content.split('axios.put').join('api.put');
content = content.split('axios.delete').join('api.delete');
content = content.split(', getHeaders()').join('');

fs.writeFileSync('frontend/src/pages/AdminDashboard.jsx', content);
console.log('AdminDashboard updated');

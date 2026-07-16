const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

process.setMaxListeners(50);

// Generate self-signed certificates
const generateCertificates = () => {
    const selfsigned = require('selfsigned');
    const attrs = [{ name: 'commonName', value: 'localhost' }];
    const pems = selfsigned.generate(attrs, { days: 365 });
    
    // Write certificates to files
    fs.writeFileSync('key.pem', pems.private);
    fs.writeFileSync('cert.pem', pems.cert);
    console.log('SSL certificates generated successfully');
};

// Generate certificates if they don't exist
if (!fs.existsSync('key.pem') || !fs.existsSync('cert.pem')) {
    generateCertificates();
}

const app = express();

// Serve static files from current directory
app.use(express.static(__dirname));

// Serve minds folder
app.use('/minds', express.static(path.join(__dirname, 'minds')));

const { execSync } = require('child_process');

function getLocalIP() {
    try {
        // Get default gateway interface on Windows
        const route = execSync('route print 0.0.0.0').toString();
        const lines = route.split('\n');

        for (const line of lines) {
            if (line.includes('0.0.0.0')) {
                const parts = line.trim().split(/\s+/);
                const interfaceIP = parts[3]; // Interface column
                return interfaceIP;
            }
        }
    } catch (err) {
        console.log('Could not determine default interface:', err);
    }

    return 'localhost';
}

const SSL_PORT = 3000;
const localIP = getLocalIP();

// Create HTTPS server
const server = https.createServer({
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
}, app);

server.listen(SSL_PORT, '0.0.0.0', () => {
    console.log('=== AR HTTPS Server Started ===');
    console.log(`Local: https://localhost:${SSL_PORT}`);
    console.log(`Network: https://${localIP}:${SSL_PORT}`);
    console.log('');
    console.log('To access from your phone:');
    console.log(`1. Open Chrome/Safari and go to: https://${localIP}:${SSL_PORT}`);
    console.log('2. Accept the security warning (self-signed certificate)');
    console.log('3. Grant camera permissions when prompted');
    console.log('');
    console.log('Press Ctrl+C to stop the server');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    server.close(() => {
        console.log('Server stopped');
        process.exit(0);
    });
});
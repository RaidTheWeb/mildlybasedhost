const express = require("express");
const app = express();
const multer = require("multer");
const upload = multer({ destination: "./" })
const fs = require("fs");
const filetype = require("file-type");

const ID_LENGTH = 4; // Length for the filenames (minus extensions, the longer the length the more unique the ids will be, we don't need this though as there won't be that many files at any given time.)
const MAX_CONTENT_LENGTH = 67108864; // 64MB
const MIN_AGE_DAYS = 2; // Shortest amount of time a file can exist for (for the upper limits)
const MAX_AGE_DAYS = 30; // Longest amount of time a file can exist for (we go for a month here for reasons.)

setInterval(() => {
    let files = fs.readdirSync(__dirname + '/data/');
    files.forEach(file => {
        let stat = fs.statSync(__dirname + '/data/' + file);
        let current = new Date().getMilliseconds();
        let age = Math.floor((current - stat.mtimeMs) / (24 * 60 * 60 * 1000));

        let maxage = MIN_AGE_DAYS + (-MAX_AGE_DAYS + MIN_AGE_DAYS) * (stat.size / MAX_CONTENT_LENGTH - 1) ** 3;

        if(age >= maxage) fs.unlinkSync(__dirname + '/data/' + file);
    });
}, 5000);

const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
const ID = (length) => Math.random().toString(36).substr(2, length);

let extensions = JSON.parse(fs.readFileSync(__dirname + '/mimetypes.json'));
console.log(__dirname)

const extensionsreversed = {};
const _keys = Object.keys(extensions);
_keys.forEach(key => {
    extensionsreversed[extensions[key]] = key;
})

app.post('/', upload.single("file"), async (req, res) => {

    if(!req.file) {
        res.send('No file uploaded.');
        return;
    }

    if(req.file.size > MAX_CONTENT_LENGTH) {
        res.send(`File size exceeds max content length. (${formatBytes(req.file.size)} > ${formatBytes(MAX_CONTENT_LENGTH)})`);
        return;
    }

    let id = ID(ID_LENGTH);
    let ext = (await filetype.fromBuffer(req.file.buffer))
        .ext;
    if(ext == undefined) {
        ext = extensions[extensionsreversed[req.file.originalname.split('.').pop()]];
    }

    fs.writeFileSync(__dirname + '/data/' + id + '.' + ext, req.file.buffer);
    
    res.send('https://' + req.hostname + '/' + id + '.' + ext);
});

app.get('/', (req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Content-Length", fs.statSync(__dirname + '/index.html').size);
    res.send(fs.readFileSync(__dirname + '/index.html'));
});

app.get('/:filename', async (req, res) => {
    if(req.params.filename == 'robots.txt') {
        res.send("User-Agent: *\nDisallow: /\n")
        return;
    }
    if(fs.existsSync(__dirname + '/data/' + req.params.filename)) {
        let mime = (await filetype.fromFile(__dirname + '/data/' + req.params.filename)).mime;
        res.setHeader("Content-Type", mime);
        res.setHeader("Content-Length", fs.statSync(__dirname + '/data/' + req.params.filename).size);
        res.send(fs.readFileSync(__dirname + '/data/' + req.params.filename));
    } else {
	//console.log(__dirname + '/data/' + req.params.filename)
        res.sendStatus(404);
    }
});

app.listen(8000, () => console.log(`Listening on port 8000!`));

// fileZipper accepts multiple files in a simple POST request and returns
// a zipped folder containing those files. At the moment this checks NOTHING
// the uploaded files must have the name 'files' or it will not zip.
// All uploaded files get saved to ./uploads/ with seemingly random strings
// and no fiel extension.

const express  = require('express');
const multer   = require('multer');
const archiver = require('archiver');
const fs       = require('fs');

const upload = multer({ dest: 'uploads/' });

const port = 3000;
const app = express();


app.post('/', upload.array('files'), (req,res)=> {
    res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-disposition': 'attachment; filename=myFile.zip'
    });

    // zip the uploaded files
    const archive = archiver('zip');
    archive.pipe(res)

    // put each uploaded file into the zip folder
    req.files.forEach( (current) => {
        archive.append(fs.createReadStream(current.path), { name: current.originalname});
    })

    archive.finalize();
});


app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

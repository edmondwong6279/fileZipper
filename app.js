// fileZipper accepts multiple files in a simple POST request and returns
// a zipped folder containing those files. At the moment this checks NOTHING
// the uploaded files must have the name 'files' or it will not zip.

const express   = require('express');
const ruid = require('express-ruid');
const multer    = require('multer');
const archiver  = require('archiver');
const rimraf = require('rimraf');
const fs = require('fs')

const upload = multer({storage: multer.diskStorage({
                            filename : (req, file, cb) => {
                                cb(null, file.originalname);
                            },
                            destination: (req, file, cb) => {
                                const dir = 'uploads/'+req.rid;
                                if (!fs.existsSync(dir)){
                                    fs.mkdir(dir, (err) => {if (err) throw err});
                                }
                                cb(null, './uploads/'+req.rid+'/');
                            },
                        })
});

const port = 3000;
const app = express();
// for unique ID's with duplicate requests at the same time, defaults to / which normally
// denotes subdirectories
app.use(ruid({ setInContext: true, prefixSeparator: '-' }));


// deletes saved files and the directory they are in.
const cleanUploads = async (uniqueId) => {
    const files = await fs.promises.readdir('./uploads/'+uniqueId);
    await Promise.all(files.map( file => {
        fs.promises.unlink('./uploads/'+uniqueId+'/'+file)
    }));
    // A key point here is the maxBusyTries option. It appears that the default (3) is not enough if
    // we spam requests in insomnia ie the directories are not deleted
    await rimraf('./uploads/'+uniqueId+'/', {maxBusyTries: 10},  () => {
        console.log('Cleaned upload directory: '+ uniqueId)});
}


const appendToArchive = async (archive, current) => {
    return new Promise((res,rej) => {
        const readStream = fs.createReadStream(current.path);
        archive.append(readStream, { name: current.originalname})
        res();
    })
}


app.post('/', upload.array('files'), async (req,res)=> {
    console.log('Received request. Id: '+req.rid);
    res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-disposition': 'attachment; filename=myFile.zip'
    });

    const archive = archiver('zip');
    archive.pipe(res)

    await Promise.all(req.files.map( file => {
        appendToArchive(archive, file)
    }))

    archive.finalize();
    await cleanUploads(req.rid);
});


app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

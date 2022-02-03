// fileZipper accepts multiple files in a simple POST request and returns
// a zipped folder containing those files. At the moment this checks NOTHING
// the uploaded files must have the name 'files' or it will not zip.

const express = require("express");
const ruid = require("express-ruid");
const multer = require("multer");
const archiver = require("archiver");
const fs = require("fs");

const upload = multer({
    storage: multer.diskStorage({
        filename: (req, file, cb) => {
            cb(null, file.originalname);
        },
        destination: async (req, file, cb) => {
            const dir = `uploads/${req.rid}`;
            try {
                await fs.promises.access(dir);
            } catch (e) {
                await fs.promises.mkdir(dir);
            }
            cb(null, `./uploads/${req.rid}/`);
        },
    }),
});

const port = 3000;
const app = express();
// for unique ID's with duplicate requests at the same time, defaults to / which normally
// denotes subdirectories
app.use(ruid({ setInContext: true, prefixSeparator: "-" }));
app.use(express.static('public'))

// deletes saved files and the directory they are in.
const cleanUploads = async (uniqueId) => {
    const files = await fs.promises.readdir(`./uploads/${uniqueId}`);
    await Promise.all(
        files.map(async (file) => {
            await fs.promises.unlink(`./uploads/${uniqueId}/${file}`);
        })
    );
    await fs.promises.rmdir(`./uploads/${uniqueId}/`);
};

app.post("/", upload.array("files"), async (req, res) => {
    console.log(`Received request. Id: ${req.rid}`);
    res.writeHead(200, {
        "Content-Type": "application/zip",
        "Content-disposition": "attachment; filename=myFile.zip",
    });

    const archive = archiver("zip");
    archive.on("end", async () => {
        console.log("archive stream completed");
        await cleanUploads(req.rid);
    });

    archive.pipe(res);

    req.files.forEach((file) => {
        const readStream = fs.createReadStream(file.path);
        archive.append(readStream, { name: file.originalname });
    });

    archive.finalize();
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

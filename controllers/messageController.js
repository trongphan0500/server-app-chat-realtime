const Messages = require("../models/messageModel");
const formidable = require("formidable");
const fs = require("fs");
const messageModel = require("../models/messageModel");
const { log } = require("console");
const aws = require("aws-sdk");
const { S3Client } = require("@aws-sdk/client-s3");
const multer = require("multer");
const multerS3 = require("multer-s3");

const s3 = new aws.S3({
    accessKeyId: "AKIARYU77JXTDSBHWEG5",
    secretAccessKey: "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",
    region: "us-west-1",
});

const loopArray = (images, fileArray) => {
    for (var i = 0; i < fileArray.length; i++) {
        let fileLocation = fileArray[i].location;
        images.push(fileLocation);
    }
};
const loopArrayName = (images, fileArray) => {
    for (var i = 0; i < fileArray.length; i++) {
        let fileNameOrigin = fileArray[i].originalname;
        images.push(fileNameOrigin);
    }
};

const checkFileTypesByName = (array) => {
    for (var i = 0; i < array.length; i++) {
        console.log(array[i]);
        var endPoint = array[i].split(".");
        var ext = endPoint[endPoint.length - 1];
        console.log(ext);
        switch (ext.toLowerCase()) {
            case "mp4":
            case "doc":
            case "video":
            case "document":
            case "pdf":
                //etc
                return true;
        }
    }
    return false;
};

const upload = (bucketName) =>
    multer({
        storage: multerS3({
            s3,
            bucket: bucketName,
            metadata: function (req, file, cb) {
                cb(null, { fieldName: file.fieldname });
            },
            // if(checkFileTypesByName){

            // }
            key: function (req, file, cb) {
                cb(null, `image-${Date.now()}+${file.originalname}`);
            },
        }),
    });

const uploadS3 = (bucketName) =>
    multer({
        storage: multerS3({
            s3: s3,
            acl: "public-read",
            bucket: bucketName,
            metadata: (req, file, callBack) => {
                callBack(null, { fieldName: file.fieldname });
            },
            key: (req, file, callBack) => {
                var fullPath = "products/" + file.originalname;
                callBack(null, fullPath);
            },
        }),
        limits: { fileSize: 2000000 },
        fileFilter: function (req, file, cb) {
            checkFileType(file, cb);
        },
    }).array("photos", 10);

module.exports.getMessages = async (req, res, next) => {
    try {
        console.log("getMessages");
        const { from, to } = req.body;

        const messages = await Messages.find({
            users: {
                $all: [from, to],
            },
        }).sort({ updatedAt: 1 });

        const projectedMessages = messages.map((msg) => {
            return {
                fromSelf: msg.sender.toString() === from,
                message: msg.message.text,
                image: msg.message.image,
                files: msg.message.files,
                createAt: msg.createdAt,
            };
        });
        res.json(projectedMessages);
    } catch (ex) {
        next(ex);
    }
};

module.exports.addMessage = async (req, res, next) => {
    try {
        console.log("addMessage");
        const { from, to, message } = req.body;
        const data = await Messages.create({
            message: { text: message, image: "" },
            users: [from, to],
            sender: from,
        });

        if (data) return res.json({ msg: "Message added successfully." });
        else return res.json({ msg: "Failed to add message to the database" });
    } catch (ex) {
        next(ex);
    }
};

module.exports.imageMessageSend = (req, res, next) => {
    const form = formidable();
    console.log("Connected to imageMessageSend ");

    var senderNameOut, reseverIdOut;
    form.parse(req, (err, fields, files) => {
        console.log("Into dataForm");
        const { senderName, imageName, reseverId, images, file } = fields;
        senderNameOut = senderName;
        reseverIdOut = reseverId;
    });
    const uploadMultle = upload("appchat-picture-profile").array("images", 3);

    uploadMultle(req, res, async (error) => {
        console.log(req.files);
        // if (checkFileType(req.files)) {
        //     console.log("Image");
        // }
        // console.log("Not image ");
        if (error) {
            console.log("errors", error);
        } else {
            console.log("Into create Message");
            const fileNameArray = [];
            loopArrayName(fileNameArray, req.files);
            if (checkFileTypesByName(fileNameArray)) {
                console.log("Correct image type");
            }
            const imagesArray = [];
            loopArray(imagesArray, req.files);
            const insertMessage = await messageModel.create({
                sender: senderNameOut,
                users: [senderNameOut, reseverIdOut],
                message: {
                    text: "",
                    image: imagesArray,
                    files: null,
                },
            });
            res.status(200).json({ data: imagesArray });
        }
    });
};

module.exports.fileMessageSend = (req, res, next) => {
    const form = formidable();
    console.log("Connected to File send Message ");

    var senderNameOut, reseverIdOut;
    form.parse(req, (err, fields, files) => {
        const { senderName, imageName, reseverId, images, file } = fields;
        senderNameOut = senderName;
        reseverIdOut = reseverId;
    });
    const uploadMultle = upload("appchat-picture-profile").array("images", 3);

    uploadMultle(req, res, async (error) => {
        if (error) {
            console.log("errors", error);
        } else {
            console.log("Into create Message");
            const fileNameArray = [];
            loopArrayName(fileNameArray, req.files);
            if (checkFileTypesByName(fileNameArray)) {
                console.log("Correct image type");
            }
            const imagesArray = [];
            loopArray(imagesArray, req.files);
            const insertMessage = await messageModel.create({
                sender: senderNameOut,
                users: [senderNameOut, reseverIdOut],
                message: {
                    text: "",
                    image: null,
                    files: imagesArray,
                },
            });
            res.status(200).json({ data: imagesArray });
        }
    });
};

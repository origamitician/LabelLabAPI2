// the updated server.js file is separately deployed temporarily for testing purposes. The code is at https://github.com/origamitician/LabelLabAPI2. 

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");

require('dotenv').config({ path: path.join(__dirname, 'secrets.env') });

const bodyParser = require('body-parser')
const jsonParser = bodyParser.json()
const app = express();
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true}).then(() => {
  console.log("connected to database")
})

app.use(express.static(path.join(__dirname, "public")));

// Optionally, set up a specific route for the index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const htagSubSchema = new mongoose.Schema({
  hashtagName: String,
  hashtagAvg: Number,
  hashtagSubmissions: Number,
  hashtagRatingArray: [Number],
})

const htag = new mongoose.Schema({
  videoCategory: String,
  videoID: String,
  numSubmissions: Number,
  isRelatedCount: Number,
  hashtags: [String],
  hashtagInfo: [htagSubSchema],
})

const Hashtags = mongoose.model('Hashtags', htag);
app.post('/new', jsonParser, (req, res) => {
  console.log("post requested")
  let bodyData = req.body;
  console.log(bodyData)
  let songID = bodyData.videoID.toString()
  console.log("songID to look for is " + songID)
  Hashtags.findOne({videoID: songID}).then((data) => {
    console.log("> Data is: " + JSON.stringify(data))
    if (data) {
      // if there is an object with an video ID inserted.
      console.log("Video ID exists")

      // merge the incoming data. bodyData = incoming mongoDB document, tempMergedData = current mongoDB document.
      let tempMergedData = data
      console.log("data is: " + JSON.stringify(tempMergedData))
      const currentRatedHashtags = tempMergedData.hashtagInfo.map(e => e.hashtagName)
      tempMergedData.numSubmissions += 1;
      if (bodyData.isRelated) {
        tempMergedData.isRelatedCount += 1;
      }
      const mergedArray = tempMergedData.hashtags.concat(currentRatedHashtags);
      const uniqueArray = mergedArray.filter((value, index) => mergedArray.indexOf(value) === index);
      tempMergedData.hashtags = uniqueArray;
      
      
      Object.keys(bodyData.htData).forEach(key => {
        const hashtagValue = bodyData.htData[key]
        const indexOfHashtag = currentRatedHashtags.indexOf(key)
        if (indexOfHashtag == -1) {
          // if the incoming hashtag does not exist in the document.
          tempMergedData.hashtagInfo.push({
            hashtagName: key, 
            hashtagAvg: hashtagValue, 
            hashtagSubmissions: 1, 
            hashtagRatingArray: [hashtagValue]
          })
        } else {
          // if the incoming hashtag exists in the document.
          let doc = tempMergedData.hashtagInfo[indexOfHashtag]
          doc.hashtagSubmissions++;
          doc.hashtagRatingArray.push(hashtagValue);
          let avg = doc.hashtagAvg;
          doc.hashtagAvg += (hashtagValue - avg) / doc.hashtagSubmissions
        }
      })

      Hashtags.findOneAndUpdate({videoID: songID}, tempMergedData, {new: true}).then((data) => {
        console.log("==============================")
        console.log("Successfully merged. New data is: ")
        console.log(JSON.stringify(data))
      })
    } else {
      console.log("Video ID does not exist")
      let hashtagInfo = [];
      Object.keys(bodyData.htData).forEach(obj => {
        const hashtagValue = bodyData.htData[obj]
        hashtagInfo.push({hashtagName: obj, hashtagAvg: hashtagValue, hashtagSubmissions: 1, hashtagRatingArray: [hashtagValue]})
      })

      let isRelatedNum = 0;
      if (bodyData.isRelated) {
        isRelatedNum = 1
      }
      let h = new Hashtags({
        videoCategory: 'test',
        videoID: songID,
        numSubmissions: 1,
        isRelatedCount: isRelatedNum,
        hashtags: Object.keys(bodyData.htData),
        hashtagInfo: hashtagInfo,
      })
    
      h.save().then((err, docs) => {
        if (err) console.log(err);
        res.send(`Successfully added`)
      })
    }
  })
})

app.get("/all", (req, res) => {
  Hashtags.find({}).then((data) => {
    res.json(data);
  })
})

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log("Server is running on port: " + port);
})
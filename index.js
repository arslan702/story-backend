const bodyParser = require('body-parser');
const express = require('express');
const hbs = require('hbs');
const path = require('path');
const User_story = require('./src/config');
const OpenAI = require('openai');
const PDFDocument = require('pdfkit');
const request = require('request');
const fs = require('fs');
require('dotenv').config();
const googleTTS = require('google-tts-api');
const https = require('https');
const say = require('say');
const viewspath = path.join(__dirname, './templates/views');

const app = express();
app.use('/audio', express.static(path.join(__dirname, 'src')));
app.use(express.static(__dirname));
app.set('view engine', 'hbs')
app.set('views', viewspath);
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.render('storyform');
})

const openai = new OpenAI({
    apiKey: "YOUR_OPEN_AI_API KEY"  //login to openai.com and generate your secret key (API Key)
});

let generatedStory = '';
let character_name = '';
let imageUrl = '';
let sanitizedParagraphs = '';
let download_story = ''

app.post("/generate-story", async (req, res) => {
    try {
        const { title, description, characterName, characterAge, characterGender, question1, question2, question3, question4, question5 } = req.body;
        character_name = characterName;

        const promptee = `create a awesome story on "${title}",${description},
        ${question2},${question3},${question4},${question5} in 6 paragraphs . Remember length of each paragraph is only 3 lines and when you creating a story focus on questions. also give the best title to each paragraph in double quotes that helps me to create an ai image using that title.And please don't mention paragraph headings`;

        const chatCompletion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ "role": "user", "content": promptee }],
        });
        generatedStory = chatCompletion.choices[0].message.content;
        console.log(generatedStory);

        const matchedWords = generatedStory.match(/"([^"]+)"/g);
        const img_titles = matchedWords.map(match => match.replace(/"/g, ''));
        console.log(img_titles);

        // The below code is for generating image using text2img api of stable diffusion api 
        // You can use this api for generating image using img_titles array

        // var options = {
        //     'method': 'POST',
        //     'url': 'https://stablediffusionapi.com/api/v3/text2img',
        //     'headers': {
        //         'Content-Type': 'application/json'
        //     },
        //     body: JSON.stringify({
        //         "key": "YOUR_STABLE_DIFFUSION_API_KEY", //login to stable diffusion api and generate your secret key (API Key)
        //         "prompt": `image of ${characterGender} child on ${img_titles[0]}))`, //you can use img_titles array for generating image 
        //         "negative_prompt": null,
        //         "width": "512",
        //         "height": "512",
        //         "samples": "1",
        //         "num_inference_steps": "20",
        //         "seed": null,
        //         "guidance_scale": 7.5,
        //         "safety_checker": "yes",
        //         "multi_lingual": "no",
        //         "panorama": "no",
        //         "self_attention": "no",
        //         "upscale": "no",
        //         "embeddings_model": null,
        //         "webhook": null,
        //         "track_id": null
        //     })
        // };

        // request(options, function (error, response) {
        //     if (error) throw new Error(error);
        //     const jsonObject = JSON.parse(response.body);
        //     const outputArray = jsonObject.output;
        //     imageUrl = outputArray[0];
        //     console.log("URL: " + imageUrl);
        // });

// Use the above code multiple times for generating multiple images using img_titles array. Total images generated is equal to length of img_titles array

        const Store_storing = {
            User_Name: `${characterName}`,
            User_story: generatedStory
        }
        await User_story.add(Store_storing); //store the user story in firestore database

        const paragraphs = generatedStory.split('\n');
        sanitizedParagraphs = paragraphs.map(paragraph => {
            return paragraph.replace(/"[^"]+"/g, '');
        }).filter(paragraph => paragraph.trim() !== '');

        download_story = sanitizedParagraphs.join('\n');

        res.render("userstory", { story: sanitizedParagraphs, image: imageUrl }); //render the user story in userstory.hbs file

    } catch (error) {
        if (error instanceof OpenAI.APIError) {
            console.error(error.status);
            console.error(error.message);
            console.error(error.code);
            console.error(error.type);
        } else {
            console.log(error);
        }
    }
});

// The below code is for download story in pdf format
app.get("/generate-pdf", (req, res) => {
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${character_name}-story.pdf"`);
    doc.pipe(res);
    const paragraphs = download_story.split('\n');
    doc.fontSize(22).text(`${character_name}'s Story`, { align: 'center' });
    doc.moveDown();
    doc.moveDown();
    doc.image('contact.jpg', { width: 200, height: 200, align: 'center' }); //replace contact.jpg with the image generated using text2img api
    doc.moveDown();
    doc.moveDown();
    doc.fontSize(12).text(paragraphs[0], { width: 500 });
    doc.moveDown();
    doc.moveDown();
    doc.image('bg1.jpg', { width: 200, height: 200, align: 'center' }); //replace bg1.jpg with the image generated using text2img api
    doc.moveDown();
    doc.moveDown();
    doc.fontSize(12).text(paragraphs[1], { width: 500 });
    doc.end();

    //Repeat the above same code according to the length of paragraphs array.By default the length of paragraphs array is 6  so you can repeat the above code 6 times.
});
app.get("/stop-story", (req, res) => {
    console.log("stop");
    say.stop();
    res.render("userstory"); //Confirmed that audio is stopped.
});
app.get("/play-story", (req, res) => {

    console.log("play");
    say.speak(sanitizedParagraphs);
    res.render("userstory"); //Confirmed that audio is played
});

const port = 3000;

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});
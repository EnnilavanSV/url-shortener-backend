import express from "express";
import crypto from "crypto";
import url from "../models/url.js";

const router = express.Router();

// We mount this whole file to '/api', so the route just needs to be '/shorten'
// Full URL will become: POST /api/shorten
router.post("/shorten", async (req, res) => {
  try {
    const { originalUrl, customCode } = req.body;

    if (!originalUrl) {
      return res.status(400).json({ error: "Please provide a valid URL" });
    }

    let shortCode;

    // 3. Check if the user requested a specific custom code
    if (customCode) {
      // Search the database to see if someone else is already using this code
      const existingUrl = await url.findOne({ shortCode: customCode });

      if (existingUrl) {
        // If it exists, block it and send an error back to React
        return res.status(400).json({
          error: "That custom code is already in use. Please choose another.",
        });
      }

      // If it's available, assign it!
      shortCode = customCode;
    } else {
      // 4. If no custom code was provided, generate a random 6-character string
      shortCode = crypto.randomBytes(3).toString("hex");
    }

    const newUrl = new url({
      originalUrl: originalUrl,
      shortCode: shortCode,
    });

    await newUrl.save();
    res.status(201).json(newUrl);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;

import express from "express";
import url from "../models/url.js";

const router = express.Router();

router.get("/:shortCode", async (req, res) => {
  try {
    const { shortCode } = req.params;
    const urlDocument = await url.findOne({ shortCode: shortCode });

    if (urlDocument) {
      if (!urlDocument.originalUrl) {
        return res.status(400).json({
          error:
            "This shortcode exists, but the original URL is missing in the database!",
        });
      }
      urlDocument.clicks++;
      await urlDocument.save();
      return res.redirect(urlDocument.originalUrl);
    } else {
      return res.status(404).json({ error: "URL not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;

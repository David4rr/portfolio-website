import sharp from "sharp";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function generate() {
  const githubUser = process.env.GITHUB_USERNAME || "David4rr";
  const gens = [
    `https://avatars.githubusercontent.com/${githubUser}`,
    "./public/assets/mypic.png",
  ];
  const charsArray =
    '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`. '.split(
      "",
    );

  console.log("Generating ASCII frames...");
  const frames = await Promise.all(
    gens.map(async (src) => {
      let buf;
      if (src.startsWith("http")) {
        const res = await fetch(src);
        buf = Buffer.from(await res.arrayBuffer());
      } else {
        buf = await fs.promises.readFile(src);
      }

      const { data, info } = await sharp(buf)
        .resize(80, 80, { fit: "cover" })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const rows = [];
      for (let y = 0; y < info.height; y++) {
        let row = "";
        for (let x = 0; x < info.width; x++) {
          const offset = (y * info.width + x) * info.channels;
          const alpha = data[offset + info.channels - 1];

          if (alpha < 128) {
            row += " ";
          } else {
            const r = data[offset];
            const g = data[offset + 1];
            const b = data[offset + 2];
            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

            const idx = Math.floor(
              (brightness / 255) * (charsArray.length - 1),
            );
            row += charsArray[idx];
          }
        }
        rows.push(row);
      }
      return rows;
    }),
  );

  const outputPath = path.resolve("./src/data/ascii-frames.json");
  await fs.promises.writeFile(outputPath, JSON.stringify(frames));
  console.log("Successfully wrote frames to", outputPath);
}

generate().catch(console.error);

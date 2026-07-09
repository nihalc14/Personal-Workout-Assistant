// One-time build script (PRD Story 5 / Open Questions "Form media"): builds a
// 2-frame looping GIF per catalog exercise from free-exercise-db's start/end
// position photos (public domain, Unlicense). Not run at app runtime -
// re-run manually whenever SEED_EXERCISES grows.
//
// Caveat: the source dataset only has 2 still photos (start/end position) per
// exercise, not a full motion sequence - so this is a 2-frame alternation, not
// a smooth multi-frame animation.
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import gifenc from 'gifenc';

const { GIFEncoder, quantize, applyPalette } = gifenc;

const REPO_RAW = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';
const OUT_DIR = path.resolve(import.meta.dirname, '../public/exercises');
const TARGET_WIDTH = 480;
const FRAME_DELAY_MS = 900;

// our exercise id -> free-exercise-db slug (verified against dist/exercises.json)
const MAPPING = {
  'barbell-bench-press': 'Barbell_Bench_Press_-_Medium_Grip',
  'dumbbell-shoulder-press': 'Dumbbell_Shoulder_Press',
  'incline-dumbbell-press': 'Incline_Dumbbell_Press',
  'cable-chest-fly': 'Flat_Bench_Cable_Flyes',
  'machine-chest-press': 'Leverage_Chest_Press',
  'triceps-pushdown': 'Triceps_Pushdown',
  'push-up': 'Pushups',
  'lateral-raise': 'Side_Lateral_Raise',
  'barbell-row': 'Bent_Over_Barbell_Row',
  'lat-pulldown': 'Wide-Grip_Lat_Pulldown',
  'seated-cable-row': 'Seated_Cable_Rows',
  'dumbbell-row': 'One-Arm_Dumbbell_Row',
  'pull-up': 'Pullups',
  'barbell-curl': 'Barbell_Curl',
  'face-pull': 'Face_Pull',
  'barbell-back-squat': 'Barbell_Squat',
  'romanian-deadlift': 'Romanian_Deadlift',
  'leg-press': 'Leg_Press',
  'leg-curl': 'Seated_Leg_Curl',
  'leg-extension': 'Leg_Extensions',
  // no dumbbell-specific walking lunge in the dataset; barbell version is the
  // closest visual match for the same movement pattern.
  'walking-lunge': 'Barbell_Walking_Lunge',
  'calf-raise': 'Standing_Calf_Raises',
  'bodyweight-squat': 'Bodyweight_Squat',
};

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function toRawFrame(buf, width, height) {
  const { data } = await sharp(buf)
    .resize(width, height, { fit: 'cover' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

async function buildGif(frame0Buf, frame1Buf) {
  const meta = await sharp(frame0Buf).metadata();
  const width = TARGET_WIDTH;
  const height = Math.round(TARGET_WIDTH * (meta.height / meta.width));

  const rgba0 = await toRawFrame(frame0Buf, width, height);
  const rgba1 = await toRawFrame(frame1Buf, width, height);

  const gif = GIFEncoder();
  // Only 2 unique frames needed - the GIF's repeat:0 (infinite loop) already
  // cycles them forever, so duplicating frames here would just double file size.
  for (const rgba of [rgba0, rgba1]) {
    const palette = quantize(rgba, 256);
    const index = applyPalette(rgba, palette);
    gif.writeFrame(index, width, height, { palette, delay: FRAME_DELAY_MS, repeat: 0 });
  }
  gif.finish();
  return Buffer.from(gif.bytes());
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const attributions = {};

  for (const [ourId, slug] of Object.entries(MAPPING)) {
    try {
      const [frame0, frame1] = await Promise.all([
        fetchBuffer(`${REPO_RAW}/${slug}/0.jpg`),
        fetchBuffer(`${REPO_RAW}/${slug}/1.jpg`),
      ]);
      const gifBuf = await buildGif(frame0, frame1);
      const filename = `${ourId}.gif`;
      await writeFile(path.join(OUT_DIR, filename), gifBuf);
      attributions[filename] = {
        source: 'free-exercise-db',
        sourceExerciseId: slug,
        sourceUrls: [`${REPO_RAW}/${slug}/0.jpg`, `${REPO_RAW}/${slug}/1.jpg`],
        license: 'Unlicense (public domain)',
        licenseUrl: 'https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE',
      };
      console.log(`OK ${filename} (${(gifBuf.length / 1024).toFixed(0)} KB)`);
    } catch (err) {
      console.error(`FAILED ${ourId} (${slug}): ${err.message}`);
    }
  }

  await writeFile(
    path.join(OUT_DIR, 'ATTRIBUTIONS.json'),
    JSON.stringify(attributions, null, 2)
  );
  console.log(`\nWrote ${Object.keys(attributions).length} GIFs + ATTRIBUTIONS.json to ${OUT_DIR}`);
}

main();

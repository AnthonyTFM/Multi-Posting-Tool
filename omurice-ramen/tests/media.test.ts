import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.DATABASE_PATH = ":memory:";
process.env.MEDIA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "omu-media-"));

import assert from "node:assert/strict";
import { test } from "node:test";
import { deleteMedia, FILENAME_RE, MediaError, parseRange, saveMedia, siteMedia, sniff } from "../src/lib/media.ts";
import { getItem, updateItem } from "../src/lib/menu.ts";
import { getSettings, updateSettings } from "../src/lib/settings.ts";

const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);
const MP4 = new Uint8Array([0, 0, 0, 0x18, ...Buffer.from("ftypisom"), 0, 0, 2, 0]);
const MOV = new Uint8Array([0, 0, 0, 0x14, ...Buffer.from("ftypqt  "), 0, 0, 0, 0]);
const HEIC = new Uint8Array([0, 0, 0, 0x18, ...Buffer.from("ftypheic"), 0, 0, 0, 0]);
const WEBM = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 1, 0x42, 0xf7, 0x81]);

test("sniffs real file types from bytes, not names", () => {
  assert.deepEqual(sniff(JPG), { ext: "jpg", kind: "image" });
  assert.deepEqual(sniff(PNG), { ext: "png", kind: "image" });
  assert.deepEqual(sniff(MP4), { ext: "mp4", kind: "video" });
  assert.deepEqual(sniff(MOV), { ext: "mov", kind: "video" });
  assert.deepEqual(sniff(WEBM), { ext: "webm", kind: "video" });
  assert.equal(sniff(HEIC), null);
  assert.equal(sniff(new TextEncoder().encode("<script>alert(1)</script>")), null);
});

test("save, assign, delete cleans every reference", () => {
  assert.throws(() => saveMedia(new TextEncoder().encode("hello world, not an image")), MediaError);
  const photo = saveMedia(JPG, "Tonkotsu pour");
  const clip = saveMedia(MP4, "Omurice fold");
  assert.match(photo.filename, FILENAME_RE);
  assert.equal(photo.url, `/media/${photo.filename}`);
  assert.ok(fs.existsSync(path.join(process.env.MEDIA_DIR!, photo.filename)));

  updateSettings({ heroMediaId: clip.id, galleryIds: [photo.id, clip.id] });
  updateItem("classic-tonkotsu", { image: photo.url });
  assert.equal(siteMedia().hero?.id, clip.id);
  assert.equal(siteMedia().gallery.length, 2);

  deleteMedia(photo.id);
  assert.equal(getItem("classic-tonkotsu")?.image, null);
  assert.deepEqual(getSettings().galleryIds, [clip.id]);
  assert.ok(!fs.existsSync(path.join(process.env.MEDIA_DIR!, photo.filename)));
  deleteMedia(clip.id);
  assert.equal(getSettings().heroMediaId, null);
});

test("filenames can't escape the media folder", () => {
  for (const bad of ["../x.jpg", "a/b.jpg", "x.svg", "x.html", "..%2Fdb.jpg", ".jpg"]) assert.equal(FILENAME_RE.test(bad), false, bad);
});

test("HTTP Range parsing", () => {
  assert.equal(parseRange(null, 100), null);
  assert.deepEqual(parseRange("bytes=0-9", 100), { start: 0, end: 9 });
  assert.deepEqual(parseRange("bytes=90-", 100), { start: 90, end: 99 });
  assert.deepEqual(parseRange("bytes=-10", 100), { start: 90, end: 99 });
  assert.deepEqual(parseRange("bytes=50-500", 100), { start: 50, end: 99 });
  assert.equal(parseRange("bytes=100-", 100), "invalid");
  assert.equal(parseRange("bytes=5-1", 100), "invalid");
  assert.equal(parseRange("items=0-1", 100), "invalid");
});

import { updateVideoData, currentItem } from "../app.js";
import { Deferred } from "./deferred.js";

const tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName("script")[0];
/** @type {Node} */(firstScriptTag.parentNode).insertBefore(tag, firstScriptTag);

/** @type {Deferred<any>} */
export const player = new Deferred();

/**
 * @param {any} event
 */
function onReady(event) {
	player.resolve(event.target);
}

/** @type {number | null} */
let timestampUpdateInterval = null;

/**
 * @param {any} event
 */
function onStateChange(event) {
	if (timestampUpdateInterval !== null) {
		clearInterval(timestampUpdateInterval);
		timestampUpdateInterval = null;
	}

	if (currentItem === null) {
		return;
	}

	switch (event.data) {
		case 5: {
			if ("title" in currentItem) {
				return;
			}

			const { video_id, title } = event.target.getVideoData();

			if (video_id !== currentItem.videoId) {
				throw new Error("Loaded video ID does not match currentItem.videoId");
			}

			const duration = event.target.getDuration();

			currentItem.title = title;
			currentItem.duration = duration;

			updateVideoData();
		} break;
		case 1: {
			timestampUpdateInterval = setInterval(function () {
				if (currentItem === null) {
					clearInterval(/** @type {number} */(timestampUpdateInterval));
					timestampUpdateInterval = null;
					return;
				}

				const { video_id } = event.target.getVideoData();

				if (video_id !== currentItem.videoId) {
					throw new Error("Loaded video ID does not match currentItem.videoId");
				}

				currentItem.timestamp = event.target.getCurrentTime();

				updateVideoData();
			}, 2500);

			if ("author" in currentItem) {
				return;
			}

			const { video_id, author } = event.target.getVideoData();

			if (video_id !== currentItem.videoId) {
				throw new Error("Loaded video ID does not match currentItem.videoId");
			}

			currentItem.author = author;

			updateVideoData();
		} break;
	}
}

window.onYouTubeIframeAPIReady = function () {
	const playerEl = /** @type {HTMLElement} */(document.getElementById("player"));
	const playerWidth = /** @type {HTMLElement} */(playerEl.parentNode).offsetWidth;
	const playerHeight = playerWidth / 16 * 9;

	new YT.Player(playerEl, {
		width: playerWidth | 0,
		height: playerHeight | 0,
		events: { onReady, onStateChange }
	});
};
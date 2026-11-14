import { Deferred } from "./deferred.js";

const tag = document.createElement("script");

tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName("script")[0];
/** @type {Node} */(firstScriptTag.parentNode).insertBefore(tag, firstScriptTag);

/** @type {Deferred<any>} */
export const player = new Deferred();

/** @type {any} */ (window).onYouTubeIframeAPIReady = function () {
	const playerEl = /** @type {HTMLElement} */(document.getElementById("player"));

	const playerWidth = /** @type {HTMLElement} */(playerEl.parentNode).offsetWidth;
	const playerHeight = playerWidth / 16 * 9;

	console.log(playerEl.offsetWidth | 0, playerHeight | 0);

	player.resolve(
		new /** @type {any} */(window).YT.Player(playerEl, {
			width: playerWidth | 0,
			height: playerHeight | 0
		})
	);
};
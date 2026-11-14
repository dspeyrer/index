import { Deferred } from "./deferred.js";

const tag = document.createElement("script");

tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName("script")[0];
/** @type {Node} */(firstScriptTag.parentNode).insertBefore(tag, firstScriptTag);

/** @type {Deferred<any>} */
export const player = new Deferred();

/** @type {any} */ (window).onYouTubeIframeAPIReady = function () {
	player.resolve(
		new /** @type {any} */(window).YT.Player("player", {
			width: "960",
			height: "540",
		})
	);
};
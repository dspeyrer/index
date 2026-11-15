/**
 * @import { ListItem } from "./app.types"
 */

import { Deferred } from "./app/deferred.js";
import { player } from "./app/player.js";

const listInput =
	/** @type {HTMLInputElement} */
	(document.getElementById("list-input"));

const listItemsEl =
	/** @type {HTMLUListElement} */
	(document.getElementById("list-items"));

/** @type {ListItem | null} */
export let currentItem = null;

/** @type {Deferred<IDBDatabase>} */
const db = new Deferred();

/**
 * @type {Deferred<Map<string, ListItem>>}
 */
const listItems = new Deferred();

/**
 * @param {string} videoId
 */
function makeListItemNode(videoId) {
	const listItem = document.createElement("li");
	listItem.classList.add("list-item");

	const listItemLink = document.createElement("a");
	listItemLink.href = `#/v/${videoId}/`;
	listItemLink.classList.add("list-item-link");

	const listItemThumb = document.createElement("img");
	listItemThumb.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
	listItemThumb.classList.add("list-item-thumb");

	const listItemText = document.createElement("div");
	listItemText.classList.add("list-item-text");

	const listItemTextVideoId = document.createElement("i");
	listItemTextVideoId.replaceChildren(new Text(`https://youtu.be/${videoId}`));

	listItemText.replaceChildren(listItemTextVideoId);

	listItemLink.replaceChildren(listItemThumb, listItemText);

	const listItemRemove = document.createElement("button");
	listItemRemove.classList.add("list-item-remove");
	listItemRemove.dataset["videoId"] = videoId;
	listItemRemove.replaceChildren(new Text("✕"));

	listItem.replaceChildren(listItemLink, listItemRemove);

	return listItem;
}

db.then(function (db) {
	db
		.transaction("list", "readonly")
		.objectStore("list")
		.index("createdAt")
		.getAll()
		.addEventListener("success", function () {
			const listItemNodes = [];
			// TODO: setup linting so that removing the following type declaration results in an error
			/** @type {Map<string, ListItem>} */
			const listItemMap = new Map();

			for (let i = this.result.length - 1; i >= 0; i--) {
				const item = /** @type {ListItem} */(this.result[i]);

				listItemNodes.push(makeListItemNode(item.videoId));
				listItemMap.set(item.videoId, item);
			}

			listItemsEl.replaceChildren(...listItemNodes);
			listItems.resolve(listItemMap);
		});
});

export function updateVideoData() {
	/** @type {IDBDatabase} */(db.value)
		.transaction("list", "readwrite")
		.objectStore("list")
		.put(currentItem);
}

// TODO: handle `blocked` and `error`
const openReq = indexedDB.open("index", 1);

openReq.addEventListener("upgradeneeded", function () {
	const dbList = this.result.createObjectStore("list", { keyPath: "videoId" });
	dbList.createIndex("createdAt", "createdAt");
});

openReq.addEventListener("success", function () {
	db.resolve(this.result);
});

/**
 * @param {string} url
 */
function tryParseUrl(url) {
	try {
		return new URL(url);
	} catch (e) {
		if (e instanceof TypeError) {
			return null;
		}

		throw e;
	}
}

/** @type {(item: ListItem) => void} */
const cuePlayerVideo = player.bind(function (player, item) {
	player.cueVideoById(item.videoId, item.timestamp);
});

/** @type {(videoId: string) => void} */
const updateUrlVideoId = listItems.bind(function (listItems, videoId) {
	const listItem = listItems.get(videoId);

	if (listItem !== undefined) {
		currentItem = listItem;
		cuePlayerVideo(listItem);
	} else {
		window.location.replace("#/");
	}
});

/**
 * @param hash {string}
 */
function tryParseHash(hash) {
	if (!hash.startsWith("#")) {
		return "#/";
	}

	if (!hash.endsWith("/")) {
		return hash + "/";
	}

	if (hash === "#/") {
		currentItem = null;
		return null;
	} else if (hash.startsWith("#/v/")) {
		const videoId = hash.slice(4, -1);
		updateUrlVideoId(videoId);
		return null;
	}

	return "#/";
}

function updatePath() {
	const redirect = tryParseHash(window.location.hash);

	if (redirect !== null) {
		window.location.replace(redirect);
	}
}

updatePath();

window.addEventListener("hashchange", function () {
	updatePath();
});

/** @type (videoId: string, timestamp: number) => void */
const addVideo = listItems.bind(function (listItems, videoId, timestamp) {
	if (listItems.has(videoId)) {
		listInput.value = "";
		listInput.disabled = false;

		return;
	}

	const listItem = { videoId, createdAt: new Date(), timestamp };

	/** @type {IDBDatabase} */(db.value)
		.transaction("list", "readwrite")
		.objectStore("list")
		.add(listItem)
		.addEventListener("success", function () {
			listItems.set(videoId, listItem);
			listItemsEl.insertBefore(
				makeListItemNode(videoId),
				listItemsEl.firstChild
			);

			listInput.value = "";
			listInput.disabled = false;
		});
});

/**
 * @param {string | null} string
 * @param {number} fallback
 */
function parseIntOrDefault(string, fallback) {
	if (string === null) {
		return fallback;
	}

	const parsed = parseInt(string);

	if (Number.isNaN(parsed)) {
		return fallback;
	}

	return parsed;
}

listInput.addEventListener("input", function () {
	const url = tryParseUrl(listInput.value);

	if (url === null) {
		return;
	}

	let videoId = null;

	switch (url.hostname) {
		case "www.youtube.com":
		case "youtube.com":
			if (url.pathname.startsWith("/shorts/")) {
				videoId = url.pathname.slice(8);
			} else {
				videoId = url.searchParams.get("v");
			}
			break;
		case "youtu.be":
			videoId = url.pathname.slice(1);
			break;
	}

	if (videoId === null) {
		return;
	}

	let timestamp = parseIntOrDefault(url.searchParams.get("t"), 0);

	listInput.disabled = true;

	addVideo(videoId, timestamp);
});

listItemsEl.addEventListener("click", function (event) {
	const targetEl = /** @type {HTMLElement} */(event.target);

	if (targetEl.classList.contains("list-item-remove")) {
		const removeButton = /** @type {HTMLButtonElement} */(targetEl);
		const listItemEl = /** @type {HTMLLIElement} */(targetEl.parentNode);
		const videoId = /** @type {string} */(targetEl.dataset["videoId"]);

		removeButton.disabled = true;

		/** @type {IDBDatabase} */(db.value)
			.transaction("list", "readwrite")
			.objectStore("list")
			.delete(videoId)
			.addEventListener("success", function () {
				/** @type {Map<string, ListItem>} */(listItems.value).delete(videoId);

				if (currentItem !== null && videoId === currentItem.videoId) {
					window.location.replace("#/");
				}

				listItemsEl.removeChild(listItemEl);

				removeButton.disabled = false;
			});
	}
});

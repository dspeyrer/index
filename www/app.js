import { Deferred } from "./app/deferred.js";
import { player } from "./app/player.js";

const listInput =
	/** @type {HTMLInputElement} */
	(document.getElementById("list-input"));

const listItems =
	/** @type {HTMLUListElement} */
	(document.getElementById("list-items"));

/** @type {HTMLLIElement | null} */
let firstListItem = null;

/** @type {string | null} */
let currentId = null;

/** @type {Deferred<IDBDatabase>} */
const db = new Deferred();

/** @type {Deferred<Set<string>>} */
const listItemIds = new Deferred();

/**
 * @param {string} videoId
 */
function makeListItemNode(videoId) {
	const listItem = document.createElement("li");

	const listItemLink = document.createElement("a");
	listItemLink.href = `#/v/${videoId}/`;

	const listItemThumb = document.createElement("img");
	listItemThumb.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
	listItemThumb.classList.add("list-item-thumb");

	const listItemText = new Text(videoId);

	listItemLink.replaceChildren(listItemThumb, listItemText);

	const listItemRemove = document.createElement("button");
	listItemRemove.classList.add("list-item-remove");
	listItemRemove.dataset["videoId"] = videoId;
	listItemRemove.replaceChildren(new Text("x"));

	listItem.replaceChildren(listItemLink, listItemRemove);

	return listItem;
}

db.then(function (db) {
	db
		.transaction("list", "readonly")
		.objectStore("list")
		.index("createdAt")
		.getAllKeys()
		.addEventListener("success", function () {
			const videoIds = /** @type {string[]} */(this.result).reverse();

			const listItemNodes = videoIds.map(makeListItemNode);
			firstListItem = listItemNodes[0] || null;
			listItems.replaceChildren(...listItemNodes);

			listItemIds.resolve(new Set(videoIds));
		});
});

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

/** @type {(video: string) => void} */
const updatePlayerVideo = player.bind(function (player, videoId) {
	player.cueVideoById(videoId);
});

/** @type {(videoId: string) => void} */
const updateUrlVideoId = listItemIds.bind(function (listItemIds, videoId) {
	if (listItemIds.has(videoId)) {
		currentId = videoId;
		updatePlayerVideo(videoId);
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
		currentId = null;
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

/** @type (videoId: string) => void */
const addVideoId = listItemIds.bind(function (listItemIds, videoId) {
	if (listItemIds.has(videoId)) {
		listInput.value = "";
		listInput.disabled = false;

		return;
	}

	/** @type {IDBDatabase} */(db.value)
		.transaction("list", "readwrite")
		.objectStore("list")
		.add({ videoId, createdAt: new Date() })
		.addEventListener("success", function () {
			listItemIds.add(videoId);


			const listItem = makeListItemNode(videoId);

			listItems.insertBefore(listItem, firstListItem);
			firstListItem = listItem;

			listInput.value = "";
			listInput.disabled = false;
		});
});

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

	listInput.disabled = true;

	addVideoId(videoId);
});

listItems.addEventListener("click", function (event) {
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
				/** @type {Set<string>} */(listItemIds.value).delete(videoId);

				if (videoId === currentId) {
					window.location.replace("#/");
				}

				if (listItemEl === firstListItem) {
					firstListItem = /** @type {HTMLLIElement} */(listItemEl.nextSibling);
				}

				listItems.removeChild(listItemEl);

				removeButton.disabled = false;
			});
	}
});

/**
 * @template T
 */
export class Deferred {
	constructor() {
		/** @type {((val: T) => void)[]} */
		this.consumers = [];
		/** @type {T | null} */
		this.value = null;
	}

	/**
	 * @param {T} value
	 */
	resolve(value) {
		this.value = value;

		for (const fn of this.consumers) {
			fn(this.value);
		}

		this.consumers = [];
	}

	/**
	 * @param {(val: T) => void} f
	 */
	then(f) {
		if (this.value !== null) {
			f(this.value);
		} else {
			this.consumers.push(f);
		}
	}

	consumer() {
		const self = this;

		const i = self.consumers.length;
		self.consumers.push(function () { });

		/**
		 * @param {(val: T) => void} f
		 */
		return function (f) {
			if (self.value !== null) {
				f(self.value);
			} else {
				self.consumers[i] = f;
			}
		};
	}

	/**
	 * @template {unknown[]} A
	 * @param {(val: T, ...args: A) => void} f
	 */
	bind(f) {
		const self = this;

		/** @type {A | null} */
		let currentInvocation = null;

		self.consumers.push(function (value) {
			if (currentInvocation !== null) {
				f(value, ...currentInvocation);
				currentInvocation = null;
			}
		});

		/**
		 * @param {A} args
		 */
		return function (...args) {
			if (self.value !== null) {
				f(self.value, ...args);
			} else {
				currentInvocation = args;
			}
		};
	}
}

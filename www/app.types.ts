export type ListItem = {
	itemId: number;
	videoId: string;
	timestamp: number;
	createdAt: Date;
	updatedAt?: Date;
	duration?: number;
	title?: string;
	author?: string;
};

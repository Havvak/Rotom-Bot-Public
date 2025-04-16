const { GP_THREAD_CHANNEL } = require('../consts.json');
const { sendActiveThreadsMessage } = require('../utils/threadUtils');

module.exports = {
	name: 'threadCreate',
	async execute(thread, newlyCreated, client) {
		if (!newlyCreated || thread.parentId !== GP_THREAD_CHANNEL.id) return;
		console.log(`Thread created: ${thread.name} (${thread.id})`);

		let starterMessageBody = '';
		try {
			const starterMessage = await thread.fetchStarterMessage();
			starterMessageBody = starterMessage ? starterMessage.content.trim() || '[No Content]' : '[No Content]';
			console.log(`Fetched starter message for thread ${thread.id}: ${starterMessageBody}`);
		} catch (error) {
			if (error.code === 10008) {
				console.error(`Thread ${thread.id} is not available for fetching starter message yet. Setting message body as [Pending].`);
				starterMessageBody = '[Pending]';
				// Schedule an update after a delay (e.g., 5 seconds)
				setTimeout(async () => {
					try {
						const updatedStarterMessage = await thread.fetchStarterMessage();
						const updatedMessageBody = updatedStarterMessage
							? updatedStarterMessage.content.trim() || '[No Content]'
							: '[No Content]';
						// Update the activeThreads object for this thread
						const threadData = client.activeThreads.get(thread.id);
						if (threadData) {
							threadData.starterMessageBody = updatedMessageBody;
							client.activeThreads.set(thread.id, threadData);
							console.log(`Updated starter message for thread ${thread.id}: ${updatedMessageBody}`);
							sendActiveThreadsMessage(client.activeThreads, client);
						}
					} catch (updateError) {
						console.error(`Error updating starter message for thread ${thread.id}:`, updateError);
					}
				}, 5000);
			} else {
				console.error(`Error fetching starter message for thread ${thread.id}:`, error);
				starterMessageBody = '[Error fetching message]';
			}
		}

		client.activeThreads.set(thread.id, {
			id: thread.id,
			createdTimestamp: thread.createdTimestamp,
			tagIds: thread.appliedTags || [],
			title: thread.name,
			starterMessageBody,
			reactions: new Map(), // Reactions are blank at creation
		});

		sendActiveThreadsMessage(client.activeThreads, client);
	},
};

const { GP_THREAD_CHANNEL } = require('../consts.json');

module.exports = {
	name: 'messageCreate',
	async execute(message) {
		// Ignore messages from bots to prevent loops
		if (message.author.bot) return;

		// Ensure the message is in a thread within the forum channel
		if (message.channel.parentId == GP_THREAD_CHANNEL.id) {
			// add code here
		}
	},
};

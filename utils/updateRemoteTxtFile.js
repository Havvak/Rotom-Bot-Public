const { githubTxtToken } = require('../config.json');
const {	GIST } = require('../consts.json');
const axios = require('axios');

const GITHUB_TOKEN = githubTxtToken;

async function updateGist(content = 'NULL CONTENT') {
	try {
		await axios.patch(
			`https://api.github.com/gists/${GIST.id}`,
			{
				files: {
					[GIST.fileName]: {
						content: content,
					},
				},
			},
			{
				headers: {
					'Authorization': `token ${GITHUB_TOKEN}`,
					'Accept': 'application/vnd.github.v3+json',
				},
			},
		);

		console.log('Gist updated!');
	} catch (error) {
		console.error('Error updating Gist:', error.response?.data || error.message);
	}
}

function generateTextFileLines(activeThreads) {
	const lines = [];

	// Iterate through each thread in the map
	for (const thread of activeThreads.values()) {
		// Extract a 16-digit number from the starterMessageBody.
		// This regex specifically looks for the pattern "**ID**:" followed by 16 digits.
		const idMatch = thread.starterMessageBody.match(/\*\*ID\*\*:\s*(\d{16})/);
		const number = idMatch ? idMatch[1] : '9999888877776666';

		// Extract the username from the end of the title (assumes it's the last word)
		const titleParts = thread.title.split(' ');
		const username = titleParts[titleParts.length - 1];

		// Extract the fraction (in the format [x/x]) from the title
		const fractionMatch = thread.title.match(/\[(\d+\/\d+)\]/);
		const fraction = fractionMatch ? fractionMatch[1] : 'N/A';

		// Build the line in the required format
		lines.push(`${number} | ${username} | ${fraction}`);
	}

	// Join all lines with newline characters
	return lines.join('\n');
}

module.exports = {
	updateGist,
	generateTextFileLines,
};

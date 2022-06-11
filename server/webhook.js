const request = require('request');
const fs = require('fs');

const embedColor = {
    primary: 880381,
    danger: 16711680,
    success: 65280,
    light: 16777215,
    dark: 1711649,
    info: 65535,
    warning: 16761095,
    secondary: 7107965
}

/**
 * @typedef {Object} Webhook    
 * @property {String} title
 * @property {String} description
 */

/**
 * Sends a webhook
 * @param {Webhook} options 
 */
function newWebhook(options) {
    const config = JSON.parse(fs.readFileSync(`${__dirname}/../config.json`));
    if(config.other.webhook){
        request({
            method: 'POST',
            url: config.other.webhook,
            headers: { 'Content-Type': 'application/json' },
            body: {
                content: `**${options.title}**`,
                avatar_url: config.other.logo,
                embeds: [
                    {
                        title: options.title,
                        type: 'rich',
                        description: options.description,
                        author: { name: 'VACenter', url: 'https://va-center.com' },
                        thumbnail: { url: config.other.logo, width: 480, height: 480 },
                        color: embedColor[config.other.navColor[0]]
                    }
                ]
            },
            json: true
        }, () => { });
    }
}

module.exports = {send: newWebhook}
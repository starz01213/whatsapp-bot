const db = require('../database/db');
const { CommodityService } = require('../database/services');

class ResponseGeneratorService {
  /**
   * Process incoming message and generate appropriate response
   */
  async processMessage(userMessage, userPhone) {
    const messageLower = userMessage.toLowerCase().trim();

    // Check for specific commands
    if (messageLower.includes('list') || messageLower.includes('price') || messageLower.includes('show')) {
      return await this.handleListRequest();
    }

    if (messageLower.includes('price of') || messageLower.includes('cost of')) {
      return await this.handlePriceQuery(userMessage);
    }

    if (messageLower.includes('help') || messageLower === '?') {
      return this.getHelpMenu();
    }

    if (messageLower.includes('about')) {
      return await this.handleProductInfo(userMessage);
    }

    // Try to detect commodity name in message
    return await this.handleGeneralQuery(userMessage);
  }

  /**
   * List all available commodities
   */
  async handleListRequest() {
    try {
      const commodities = await CommodityService.getAllCommodities();

      if (commodities.length === 0) {
        return 'No products available at the moment.';
      }

      let response = '📦 *Available Products:*\n\n';
      commodities.forEach((commodity, index) => {
        response += `${index + 1}. ${commodity.name}\n`;
        response += `   💰 Price: ${commodity.currency} ${commodity.price}\n`;
        if (commodity.description) {
          response += `   ℹ️ ${commodity.description}\n`;
        }
        response += '\n';
      });

      response += 'Ask about any product by typing: "price of [product name]" or "tell me about [product]"';
      return response;
    } catch (error) {
      console.error('Error listing commodities:', error);
      return 'Error retrieving product list. Please try again later.';
    }
  }

  /**
   * Handle price queries like "what is the price of rice?"
   */
  async handlePriceQuery(message) {
    try {
      const commodities = await CommodityService.getAllCommodities();

      // Extract commodity name from message
      const foundCommodity = this.findCommodityInMessage(message, commodities);

      if (!foundCommodity) {
        return `I couldn't find that product. Here are available products:\n${commodities.map(c => c.name).join(', ')}\n\nAsk "price of [product name]"`;
      }

      return `💰 *${foundCommodity.name}*\n` +
             `Price: ${foundCommodity.currency} ${foundCommodity.price}\n` +
             (foundCommodity.description ? `Description: ${foundCommodity.description}` : '');
    } catch (error) {
      console.error('Error handling price query:', error);
      return 'Error processing your request. Please try again.';
    }
  }

  /**
   * Handle product information queries
   */
  async handleProductInfo(message) {
    try {
      const commodities = await CommodityService.getAllCommodities();
      const foundCommodity = this.findCommodityInMessage(message, commodities);

      if (!foundCommodity) {
        return 'Product not found. Type "list" to see all products.';
      }

      let response = `📝 *${foundCommodity.name}*\n\n`;
      response += `💰 Price: ${foundCommodity.currency} ${foundCommodity.price}\n`;

      if (foundCommodity.category) {
        response += `📂 Category: ${foundCommodity.category}\n`;
      }

      if (foundCommodity.description) {
        response += `\nℹ️ Description:\n${foundCommodity.description}\n`;
      }

      response += '\n\nWould you like to order this product?';
      return response;
    } catch (error) {
      console.error('Error handling product info:', error);
      return 'Error retrieving product information.';
    }
  }

  /**
   * Handle general queries
   */
  async handleGeneralQuery(message) {
    try {
      const commodities = await CommodityService.getAllCommodities();
      const foundCommodity = this.findCommodityInMessage(message, commodities);

      if (foundCommodity) {
        return `Found: *${foundCommodity.name}*\n` +
               `💰 Price: ${foundCommodity.currency} ${foundCommodity.price}\n` +
               (foundCommodity.description ? `\n${foundCommodity.description}` : '') +
               `\n\nAsk "price of ${foundCommodity.name}" for details.`;
      }

      // Default response if no commodity found
      return 'I didnt understand that. Try:\n' +
             '• "list" - see all products\n' +
             '• "price of [product]" - get price\n' +
             '• "about [product]" - product details\n' +
             '• "help" - get help';
    } catch (error) {
      console.error('Error handling general query:', error);
      return 'Error processing message. Please try again.';
    }
  }

  /**
   * Find commodity by fuzzy matching
   */
  findCommodityInMessage(message, commodities) {
    const messageLower = message.toLowerCase();

    // Exact match first
    for (const commodity of commodities) {
      if (messageLower.includes(commodity.name.toLowerCase())) {
        return commodity;
      }
    }

    // Partial/fuzzy match
    for (const commodity of commodities) {
      const nameWords = commodity.name.toLowerCase().split(' ');
      const messageWords = messageLower.split(' ');

      for (const nameWord of nameWords) {
        for (const msgWord of messageWords) {
          if (this.stringSimilarity(nameWord, msgWord) > 0.7) {
            return commodity;
          }
        }
      }
    }

    return null;
  }

  /**
   * Calculate string similarity (Levenshtein distance)
   */
  stringSimilarity(s1, s2) {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1;

    const editDistance = this.getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Levenshtein distance calculation
   */
  getEditDistance(s1, s2) {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

  getHelpMenu() {
    return `🤖 *WhatsApp Bot Help*\n\n` +
           `I can help you with:\n\n` +
           `📋 *View Products:*\n` +
           `• Type "list" - see all available products\n\n` +
           `💰 *Check Prices:*\n` +
           `• Type "price of [product]"\n` +
           `• Example: "price of rice"\n\n` +
           `📝 *Product Details:*\n` +
           `• Type "about [product]"\n` +
           `• Example: "about wheat"\n\n` +
           `❓ *Questions:*\n` +
           `• Type "help" - get this menu back\n\n` +
           `Just type a product name and I'll find it for you!`;
  }
}

module.exports = new ResponseGeneratorService();

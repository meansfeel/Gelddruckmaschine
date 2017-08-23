import { currency } from "../definitions/currency";
// TODO Think if some of these methods may need to by Async?

/**
 * Abstract class for a market client defining standard interface
 * so all market places can be handled the same way.
 *
 * Types:
 * * baseCurrency: The currency in which all amounts are given (e.g. EUR)
 * * tradingCurrency: The currency that will be traded with.
 */

export abstract class MarketClient<
	tradingCurrency extends currency,
	baseCurrency extends currency,
	OfferType extends TradeOffer<currency, baseCurrency>
> {
	abstract get risk(): number;
	abstract get name(): string;
	abstract get tradingCurrency(): tradingCurrency["__as"]; // TODO Fix to ensure right string?
	abstract get baseCurrency(): baseCurrency["__as"];

	/**
     * Returns the current price one entity of *tradingCurrency*
     * can be sold at on this market, measured in *baseCurrency*.
     *
     * Remark: This price does not include any fees.
     */
	abstract getCurrentSellPrice(): Promise<baseCurrency | null>;
	/**
     * Returns the current price in *baseCurrency* for which
     * you can buy one entity of *tradingCurrency*.
     *
     * Remark: This price does not include any fees.
     */
	abstract getCurrentBuyPrice(): Promise<baseCurrency | null>;

	/**
     * Based on market sell price returns price including fees.
     */
	abstract getEffectiveSellPrice(price: baseCurrency): baseCurrency;
	/**
     * Based on market buy price returns price including fees.
     */
	abstract getEffectiveBuyPrice(price: baseCurrency): baseCurrency;
	/**
     * Returns the refund for selling one entity of *tradingCurrency* including fees.
     */
	async getEffCurrSellPrice(): Promise<baseCurrency | null> {
		const price = await this.getCurrentSellPrice();
		return price === null ? null : this.getEffectiveSellPrice(price);
	}
	/**
     * Returns the cost for _really_ buying one entity of *tradingCurrency*. (So you have 1 at the end)
     */
	async getEffCurrBuyPrice(): Promise<baseCurrency | null> {
		const price = await this.getCurrentBuyPrice();
		return price === null ? null : this.getEffectiveBuyPrice(price);
	}

	/**
     * Returns the *costs* for a certain *buyVolume* you have to pay
     * and how much the *receivedVolume* in *tradingCurrency* really is.
     * This function simulates a trade and thus takes all fees into account.
     */
	abstract getTradeAmountsForBuyVolume(
		buyVolume: tradingCurrency,
	): Promise<{ costs: baseCurrency; receivedVolume: tradingCurrency }>;

	// TODO Think if it makes sense that you could later on have sold a different volume than you wanted to sell
	/**
     * Returns the refund in *baseCurrency* you get when selling a certain *sellVolume*.
     * This function simulates a trade and thus takes all fees into account.
     */
	abstract getRefundForSellVolume(sellVolume: tradingCurrency): Promise<baseCurrency>;

	/**
     * Returns the cheapest offer currently open where you can buy
     * *tradingCurrency* for *baseCurrency*.
     * @param volume If set, only offers that can be bought for less *baseCurrency* are considered.
     */
	abstract getCheapestOfferToBuy(volume?: baseCurrency): Promise<OfferType | null>;
	/**
     * Returns the highest open offer where you can sell
     * *tradingCurrency* and get *baseCurrency* instead.
     * @param volume If set, only offers where you can sell this amount of *tradingCurrency* are taken into account.
     */
	abstract getHighestOfferToSell(volume?: tradingCurrency): Promise<OfferType | null>;

	/**
     * Places a market order to buy *amount* of *tradingCurrency*.
     * @param amount Amount of *tradingCurrency* to buy.
     * @param amount_min If set, trades with volumes between *[amount_min, amount]* are possible.
     * @returns *true* if order was successfully created, *false* otherwise.
     */
	abstract setMarketBuyOrder(amount: tradingCurrency, amount_min?: tradingCurrency): Promise<boolean>;
	/**
     * Places a market order to sell *amount* of *tradingCurrency*.
     * @param amount Amount of *tradingCurrency* to sell.
     * @param amount_min If set, trades with volumes between *[amount_min, amount]* are possible.
     * @returns *true* if order was successfully created, *false* otherwise.
     */
	abstract setMarketSellOrder(amount: tradingCurrency, amount_min?: tradingCurrency): Promise<boolean>;

	setMarketOrder(type: "buy" | "sell", amount: tradingCurrency, amount_min?: tradingCurrency): Promise<boolean> {
		// TODO Enable typings here
		return {
			buy: this.setMarketBuyOrder.bind(this),
			sell: this.setMarketSellOrder.bind(this),
		}[type](amount, amount_min);
	}

	/**
     * Executes a priviously fetched open trade offer.
     * @param offer The pending trade offer to accept.
     * @returns *true* if trade was completed, *false* if not.
     */
	abstract executePendingTradeOffer(offer: OfferType, amount: tradingCurrency): Promise<boolean>;

	abstract getAvailableTradingCurrency(): Promise<tradingCurrency>;

	abstract getAvailableBaseCurrency(): Promise<baseCurrency>;
}

export interface TradeOffer<tradingCurrency, baseCurrency> {
	amount_min: tradingCurrency;
	amount_max: tradingCurrency;
	price: baseCurrency; // per entity of tradingCurrency
	time: Date;
	type: "buy" | "sell"; // TODO Maybe externalize to own type
}

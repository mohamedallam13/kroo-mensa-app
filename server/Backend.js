(function (root, factory) {
    root.KROO_MENSA_APP = factory();
})(this, function () {

    const {
        MASTER_INDEX_ID,
        KROO_CAFE_SSID,
        KROO_CAFE_PENDING_SSID,
        KROO_AUTO_LEDGER,
        KROO_SYSTEM,
        ALL_SHEET_PARAMS,
    } = ENV

    const { Toolkit, SHEETS } = KROOLibraries
    const { readFromJSON, writeToJSON, timestampCreate } = Toolkit
    const { getSheetObjFromParamObj, createWriteArr, writeAdvancedToSheet_2 } = SHEETS

    let ordersDBSheetObj
    let krooLedgerSheetObj
    let krooSystemCafeordersDBSheetObj
    let krooCafePendingOrdersSheetObj
    let timestamp

    const paymentAccounts = {
        cash: "KROO-SAFE-KORBA-1",
        card: "GEIDEA-1",
        instapay: "KROOCC-INSTAPAY"
    }

    const paymentTypes = {
        cash: "KROO Safe",
        card: "Geidea",
        instapay: "Bank"
    }

    function getMenuItems() {
        globalSSID = KROO_CAFE_SSID
        const { menuItemsFile, membersEmailsObj } = readFromJSON(MASTER_INDEX_ID)
        console.log(menuItemsFile, membersEmailsObj)
        let menuObj = readFromJSON(menuItemsFile)
        menuObj = filterMenuItems(menuObj);
        // const emailsObj = readFromJSON(membersEmailsObj)
        // console.log({ menuObj, emailsObj })
        return JSON.stringify({ menuObj })
    }

    function filterMenuItems(menuObj) {
        const filteredMenu = {};
        for (const [section, sectionData] of Object.entries(menuObj)) {
            const filteredCategories = {};
            for (const [category, categoryData] of Object.entries(sectionData.categories)) {
                const filteredItems = categoryData.items.filter(item => item.isPublicMenu !== "FALSE");
                if (filteredItems.length > 0) {
                    filteredCategories[category] = { ...categoryData, items: filteredItems };
                }
            }
            if (Object.keys(filteredCategories).length > 0) {
                filteredMenu[section] = { ...sectionData, categories: filteredCategories };
            }
        }
        return filteredMenu;
    }


    function addOrderToBuffer(order) {
        try {
            timestamp = timestampCreate(undefined, "M/d/YYYY HH:mm:ss");
            const masterFile = readFromJSON(MASTER_INDEX_ID);
            const { cafeBuffer } = masterFile;
            const pendingOrders = readFromJSON(cafeBuffer);

            // Check if booking reference already exists in the buffer
            const existingOrderIndex = pendingOrders.findIndex(
                existingOrder => existingOrder.reference === order.reference
            );

            // If booking already exists, return without adding
            if (existingOrderIndex !== -1) {
                console.log(`Booking with reference ${order.reference} already exists in buffer`)
                return JSON.stringify({
                    success: false,
                    message: `Booking with reference ${order.reference} already exists in buffer`,
                    existingBooking: pendingOrders[existingOrderIndex]
                });
            }
            pendingOrders.push(order);
            writeToJSON(cafeBuffer, pendingOrders);
            // console.log(`Order ${order.reference} added to buffer successfully`)

            return JSON.stringify({
                success: true,
                message: `Order ${order.reference} added to buffer successfully`
            });
        } catch (error) {
            // Handle any errors
            // console.log(`Error adding order to buffer: ${error.message}`)
            return JSON.stringify({
                success: false,
                message: `Error adding order to buffer: ${error.message}`
            });
        }
    }

    function submitOrder(order) {
        console.log(order)
        const masterFile = readFromJSON(MASTER_INDEX_ID);
        const { paymentMethod } = order
        timestamp = timestampCreate(undefined, "MM/dd/YYYY HH:mm:ss")
        console.log(order.accountEmail)
        try {
            getOrdersSheet()
            const ordersObjArr = createOrdersObjArr(order)
            writeToDBSheet(ordersObjArr, ordersDBSheetObj)
            if (paymentMethod == "account") {
                getKROOCafeOrdersSheet()
                const cafeOrdersObjArr = createCafeOrdersObjArr(order)
                writeToDBSheet(cafeOrdersObjArr, krooSystemCafeordersDBSheetObj)
            } else {
                getAutoLedgerSheet()
                const ledgerObjArr = createLedgerObjArr(order)
                writeToDBSheet(ledgerObjArr, krooLedgerSheetObj)
            }
            removeFromBuffer(order, masterFile)
            return true
        } catch (e) {
            throw e
        }
    }

    function submitPendingOrder(order) {
        console.log(order)
        const masterFile = readFromJSON(MASTER_INDEX_ID);
        timestamp = timestampCreate(undefined, "MM/dd/YYYY HH:mm:ss")
        try {
            getKROOCafePendingOrdersSheet()
            const pendingOrdersObjArr = createOrdersObjArr(order)
            writeToDBSheet(pendingOrdersObjArr, krooCafePendingOrdersSheetObj)
            removeFromBuffer(order, masterFile)
            return true
        } catch (e) {
            throw e
        }
    }

    function removeFromBuffer(order, masterFile) {
        const orderReference = order.reference
        const { cafeBuffer } = masterFile;
        const pendingOrders = readFromJSON(cafeBuffer);
        const orderIndex = pendingOrders.findIndex(order => order.reference === orderReference);
        if (orderIndex !== -1) {
            pendingOrders.splice(orderIndex, 1);
            writeToJSON(cafeBuffer, pendingOrders);
            // Return success and removed booking
            console.log(`Order ${orderReference} removed from buffer`)
            return {
                success: true,
                message: `Order ${orderReference} removed from buffer`,
                removedOrder: pendingOrders[orderIndex]
            };
        } else {
            // Booking not found
            console.log(`Order with reference ${orderReference} not found in buffer`)
            return {
                success: false,
                message: `Order with reference ${orderReference} not found in buffer`
            };
        }
    }

    function createOrdersObjArr(order) {
        const { discount, orderId, paymentMethod, accountEmail } = order
        const ordersObjArr = order.items.map(item => {
            const { name, price, quantity } = item
            item.item = name
            item.amount = price * quantity
            item.email = accountEmail || "kroo.mensa.cc@kroo.cc"
            item.settled = paymentMethod == "account" ? false : true
            return { ...item, timestamp, discount, orderId, paymentMethod }
        })
        return ordersObjArr
    }

    function createLedgerObjArr(order) {
        const { discount, orderId, accountEmail, paymentMethod } = order
        const ledgerObjArr = order.items.map(item => {
            const { name, quantity, price } = item
            item.item = item.name
            item.settled = true

            const discountAdded = discount == "" || discount == 0 ? "" : " - Discount " + formatAsPercentage(discount)
            return {
                timestamp,
                type: "Income - Daily",
                category: "Cafe",
                email: accountEmail || "kroo.mensa.cc@kroo.cc",
                description: quantity + " " + name + discountAdded,
                debitCredit: "Debit",
                paymentMethod: paymentMethod == "instapay" ? "Transfer" : paymentMethod,
                amount: price * quantity * (1 - (discount / 100)),
                transactionId: orderId,
                account: paymentAccounts[paymentMethod],
                paymentType: paymentTypes[paymentMethod],
                month: (((new Date()).getMonth()) + 1) + "/" + ((new Date()).getFullYear())
            }
        })
        return ledgerObjArr
    }

    function createCafeOrdersObjArr(order) {
        const { accountEmail, discount, orderId } = order
        // timestamp	row	email	item	company	quantity	pricing	amount	discount	netAmount	settled	autoSettle	partialSettle	promocode	month
        const krooCafeObjArr = order.items.map(item => {
            const { name, quantity, price } = item
            return {
                timestamp,
                email: accountEmail,
                item: name,
                quantity,
                pricing: price,
                amount: (price * quantity),
                discount: (discount / 100),
                cafeOrderId: orderId
            }
        })
        return krooCafeObjArr
    }

    function getAutoLedgerSheet() {
        const { krooLedger } = ALL_SHEET_PARAMS
        krooLedgerSheetObj = getSheetObjFromParamObj({ ssid: KROO_AUTO_LEDGER, ...krooLedger })
    }

    function getOrdersSheet() {
        const { ordersDB } = ALL_SHEET_PARAMS
        ordersDBSheetObj = getSheetObjFromParamObj({ ssid: KROO_CAFE_SSID, ...ordersDB })
    }

    function getKROOCafeOrdersSheet() {
        const { krooSystemCafeOrders } = ALL_SHEET_PARAMS
        krooSystemCafeordersDBSheetObj = getSheetObjFromParamObj({ ssid: KROO_SYSTEM, ...krooSystemCafeOrders })
    }

    function getKROOCafePendingOrdersSheet() {
        const { krooCafePendingOrders } = ALL_SHEET_PARAMS
        krooCafePendingOrdersSheetObj = getSheetObjFromParamObj({ ssid: KROO_CAFE_PENDING_SSID, ...krooCafePendingOrders })
    }

    function writeToDBSheet(casesObjArr, sheetObj) {
        const { lastRow } = sheetObj
        const writeArr = createWriteArr(casesObjArr, sheetObj) // KROO Library version is different, it accepts sheetObj
        writeAdvancedToSheet_2(writeArr, sheetObj, undefined, (lastRow + 1))
    }

    function formatAsPercentage(num) {
        return `${(num).toFixed(2)}%`; //Already coming in as an integer
    }

    return {
        getMenuItems,
        addOrderToBuffer,
        submitOrder,
        submitPendingOrder
    }

})

function getMenuItems(order) {
    return KROO_MENSA_APP.getMenuItems(order)
}

function addToBuffer(order) {
    return KROO_MENSA_APP.addOrderToBuffer(order)
}

function addToFinishedOrders(order) {
    return KROO_MENSA_APP.submitOrder(order)
}

function addToPendingPayments(order) {
    return KROO_MENSA_APP.submitPendingOrder(order)
}

// === TEST FUNCTIONS ===
function testAddToFinishedOrders() {
    const testOrder = {
        reference: "ORDER-20240601-12345",
        orderId: "ORDER-20240601-12345",
        accountEmail: "testuser@kroo.cc",
        paymentMethod: "instapay",
        discount: 10,
        items: [
            { name: "Tea", price: 25, quantity: 2 }
        ]
    };
    const result = addToFinishedOrders(testOrder);
    console.log("Test addToFinishedOrders result:", result);
    return result;
}

function testAddToPendingPayments() {
    const testOrder = {
        reference: "ORDER-20240601-54321",
        orderId: "ORDER-20240601-54321",
        accountEmail: "testuser@kroo.cc",
        paymentMethod: "cash",
        discount: 0,
        items: [
            { name: "Coffee", price: 40, quantity: 1 }
        ]
    };
    const result = addToPendingPayments(testOrder);
    console.log("Test addToPendingPayments result:", result);
    return result;
}
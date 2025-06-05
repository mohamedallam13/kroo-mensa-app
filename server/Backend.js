(function (root, factory) {
    root.KROO_BOOKING_APP = factory();
})(this, function () {

    const {
        MASTER_INDEX_ID,
        KROO_CAFE_SSID,
        KROO_AUTO_LEDGER,
        KROO_SYSTEM,
        ALL_SHEET_PARAMS,
    } = ENV
    const { Toolkit, SHEETS } = KROOLibraries
    const { readFromJSON, timestampCreate } = Toolkit
    const { getSheetObjFromParamObj, createWriteArr, writeAdvancedToSheet_2 } = SHEETS

    let ordersDBSheetObj
    let krooLedgerSheetObj
    let krooSystemCafeordersDBSheetObj
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
        const menuObj = readFromJSON(menuItemsFile)
        const emailsObj = readFromJSON(membersEmailsObj)
        console.log({ menuObj, emailsObj })
        return JSON.stringify({ menuObj, emailsObj })
    }

    function addOrderToBuffer(order) {
        console.log(order)
    }

    function submitOrder(order) {
        console.log(order)
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
            return true
        } catch (e) {
            throw e
        }
    }

    return {
        getMenuItems,
        addOrderToBuffer,
        submitOrder
    }

})
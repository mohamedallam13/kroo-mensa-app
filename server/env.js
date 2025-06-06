; (function (root, factory) {
    root.ENV = factory()
})(this, function () {

    const MASTER_INDEX_ID = "1J2Zon-o7_f2N5VwATpCQ2Lfymx-SVI9U"
    const KROO_CAFE_SSID = "1UV7J7-0WeC5EQx2sbwB1JyVrfEwv-j36Xc2mpoPlR4o"
    const KROO_AUTO_LEDGER = "1RoRx_pFlh3fUE_8liIdYnJyUgoErWb2J_OgPxIDUlow"
    const KROO_SYSTEM = "1cVP0VUcbnXOXhPsQxaLvnLpsEwGFav0p-bkUlGmLfAM"

    const defaultDrinkPic = "https://drive.google.com/file/d/1H05vl_RtDUoHZeGp1Z_X5vqBuZtKHAr-/view?usp=drive_link"

    const ALL_SHEET_PARAMS = {
        ordersDB: {
            sheetName: "Orders",
            parseObj: {
                headerRow: 1,
                skipRows: 1,
                countRowsByCol: "A"
            }
        },
        itemsDB: {
            sheetName: "Items Menu",
            parseObj: {
                headerRow: 1,
                skipRows: 1,
                countRowsByCol: "A"
            }
        },
        stockUpDB: {
            sheetName: "InStock",
            parseObj: {
                headerRow: 1,
                skipRows: 1,
                countRowsByCol: "A"
            }
        },
        stockOutDB: {
            sheetName: "OutStock",
            parseObj: {
                headerRow: 1,
                skipRows: 1,
                countRowsByCol: "A"
            }
        },
        krooLedger: {
            sheetName: "Auto Ledger",
            parseObj: {
                headerRow: 1,
                skipRows: 1,
                countRowsByCol: "A"
            }
        },
        krooSystemCafeOrders: {
            sheetName: "Cafe Orders",
            parseObj: {
                headerRow: 1,
                skipRows: 1,
                countRowsByCol: "A"
            }
        }
    }

    return {
        MASTER_INDEX_ID,
        KROO_CAFE_SSID,
        KROO_AUTO_LEDGER,
        KROO_SYSTEM,
        ALL_SHEET_PARAMS,
        defaultDrinkPic
    }

})
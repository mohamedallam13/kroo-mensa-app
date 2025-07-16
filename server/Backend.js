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

    function checkIfEmailExists(email) {
        email = email.toString().toLowerCase()
        const { membersEmailsObj } = readFromJSON(MASTER_INDEX_ID)
        const emailsObj = readFromJSON(membersEmailsObj)
        if (emailsObj[email]){
            return email
        }
        return null
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
            getKROOCafePendingOrdersSheet()
            if(paymentMethod == "instapay") {
                const pendingOrdersObjArr = createOrdersObjArr(order)
                writeToDBSheet(pendingOrdersObjArr, krooCafePendingOrdersSheetObj)
                getOrdersSheet()
                // writeToDBSheet(pendingOrdersObjArr, ordersDBSheetObj)
                getAutoLedgerSheet()
                const ledgerObjArr = createLedgerObjArr(order)
                // writeToDBSheet(ledgerObjArr, krooLedgerSheetObj)
            }else{
                const pendingOrdersObjArr = createOrdersObjArr(order)
                writeToDBSheet(pendingOrdersObjArr, krooCafePendingOrdersSheetObj)
            }
            removeFromBuffer(order, masterFile)
            
            // Send email notification

            sendOrderNotificationEmail(order)
            console.log('Order notification email sent successfully')      
            
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
            sendOrderNotificationEmail(order)
            console.log('Order notification email sent successfully') 
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
        const { discount = 0, orderId, paymentMethod, accountEmail, paymentStatus, tableNumber, overpaidAmount,refundDue, paymentScreenshot = {} } = order
        const {url} = paymentScreenshot
        const ordersObjArr = order.items.map(item => {
            const { name, price, quantity } = item
            item.item = name
            item.amount = price * quantity
            item.netAmount = item.amount * (1 - (discount / 100))
            item.email = accountEmail || "kroo.mensa.cc@kroo.cc"
            item.settled = paymentMethod == "instapay" ? true : false
            return { ...item, timestamp, discount, orderId, paymentStatus, paymentMethod, tableNumber, overpaidAmount, refundDue, paymentURL: url }
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

    function sendOrderNotificationEmail(order) {
        try {
            const { items, totals, payment, customer, tableNumber, timestamp, orderNumber, reference } = order;
            const customerEmail = customer?.type === 'guest' ? 'Guest Order' : order.email || order.accountEmail;
            const paymentStatus = payment?.status || order.paymentStatus || 'pending';
            const paymentMethod = payment?.method || order.paymentMethod || 'unknown';
            
           // Calculate totals if not provided
            const orderTotal = totals?.total || order.total || items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const discount = order.discount || 0;
            const discountAmount = orderTotal * (discount / 100);
            const finalTotal = orderTotal - discountAmount;
            
            // Format order date
            const orderDate = new Date(timestamp).toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Build items HTML
            const itemsHtml = items.map(item => `
                <tr style="border-bottom: 1px solid #E5E7EB;">
                    <td style="padding: 12px 8px; color: #6B7280;">${item.name}</td>
                    <td style="padding: 12px 8px; text-align: center; color: #6B7280;">${item.quantity}</td>
                    <td style="padding: 12px 8px; text-align: right; color: #6B7280;">EGP ${(item.price).toFixed(2)}</td>
                    <td style="padding: 12px 8px; text-align: right; font-weight: 600; color: #333333;">EGP ${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
            `).join('');
            
            // Payment status styling
            const paymentStatusColor = paymentStatus === 'complete' ? '#10b981' : '#f59e0b';
            const paymentStatusBg = paymentStatus === 'complete' ? '#d1fae5' : '#fef3c7';
            const paymentStatusText = paymentStatus === 'complete' ? 'Paid' : 'Pending';
            
            // Overpayment info
            let overpaymentHtml = '';
            if (payment?.isOverpaid) {
                overpaymentHtml = `
                    <div style="background-color: #FEF3C7; border: 1px solid #F4B400; border-radius: 12px; padding: 15px; margin-bottom: 20px;">
                        <h4 style="margin: 0 0 8px 0; color: #E0A800; font-size: 16px; font-weight: 600;">
                            ⚠️ Overpayment Alert
                        </h4>
                        <p style="margin: 0; color: #E0A800;">
                            Customer overpaid by <strong>EGP ${payment.overpaidAmount?.toFixed(2)}</strong>. 
                            Refund may be required.
                        </p>
                    </div>
                `;
            }
            
            // Screenshot info
            let screenshotHtml = '';
            if (payment?.screenshot?.url) {
                screenshotHtml = `
                    <div style="background-color: #EFF6FF; border: 1px solid #3B82F6; border-radius: 12px; padding: 15px; margin-bottom: 20px;">
                        <h4 style="margin: 0 0 8px 0; color: #2563EB; font-size: 16px; font-weight: 600;">📸 Payment Screenshot</h4>
                        <p style="margin: 0; color: #2563EB;">
                            <a href="${payment.screenshot.url}" style="color: #2563EB; text-decoration: none; font-weight: 600;">
                                📎 View Payment Screenshot
                            </a>
                        </p>
                    </div>
                `;
            }
            
            const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New KROO Mensa Order</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #FAFAFA;">
    <div style="max-width: 600px; margin: 20px auto; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #333333 0%, #1F2937 100%); color: white; padding: 30px 20px; text-align: center;">
            <div style="width: 60px; height: 60px; background: rgba(244, 180, 0, 0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px; font-size: 24px;">
                ☕
            </div>
            <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #FFFFFF;">KROO Mensa</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9; color: #FFFFFF;">New Order Received</p>
            <div style="background: linear-gradient(135deg, #F4B400 0%, #E0A800 100%); color: #333333; padding: 10px 20px; border-radius: 25px; display: inline-block; margin-top: 15px; font-weight: 600;">
                Order #${orderNumber || reference}
            </div>
        </div>
        
        <!-- Order Info -->
        <div style="padding: 25px;">
            <div style="background-color: #FFFBEB; border: 1px solid #FEF3C7; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px 0; color: #333333; font-size: 18px; font-weight: 600;">📋 Order Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #6B7280; font-weight: 500;">Customer:</td>
                        <td style="padding: 8px 0; color: #333333; font-weight: 600; text-align: right;">${customerEmail}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6B7280; font-weight: 500;">Table:</td>
                        <td style="padding: 8px 0; color: #333333; font-weight: 600; text-align: right;">${tableNumber || 'Not specified'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6B7280; font-weight: 500;">Time:</td>
                        <td style="padding: 8px 0; color: #333333; font-weight: 600; text-align: right;">${orderDate}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6B7280; font-weight: 500;">Payment:</td>
                        <td style="padding: 8px 0; text-align: right;">
                            <span style="background: ${paymentStatusBg}; color: ${paymentStatusColor}; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                                ${paymentStatusText} - ${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}
                            </span>
                        </td>
                    </tr>
                </table>
            </div>
            
            ${overpaymentHtml}
            ${screenshotHtml}
            
            <!-- Order Items -->
            <h3 style="margin: 0 0 15px 0; color: #333333; font-size: 18px; font-weight: 600;">🛍️ Items Ordered</h3>
            <div style="border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; margin-bottom: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #FFFBEB;">
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #333333; border-bottom: 1px solid #FEF3C7;">Item</th>
                            <th style="padding: 12px; text-align: center; font-weight: 600; color: #333333; border-bottom: 1px solid #FEF3C7;">Qty</th>
                            <th style="padding: 12px; text-align: right; font-weight: 600; color: #333333; border-bottom: 1px solid #FEF3C7;">Price</th>
                            <th style="padding: 12px; text-align: right; font-weight: 600; color: #333333; border-bottom: 1px solid #FEF3C7;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
            </div>
            
            <!-- Order Total -->
            <div style="background-color: #FFFBEB; border: 1px solid #FEF3C7; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 5px 0; color: #6B7280;">Subtotal:</td>
                        <td style="padding: 5px 0; text-align: right; color: #333333; font-weight: 500;">EGP ${orderTotal.toFixed(2)}</td>
                    </tr>
                    ${discount > 0 ? `
                    <tr>
                        <td style="padding: 5px 0; color: #10B981;">Discount (${discount}%):</td>
                        <td style="padding: 5px 0; text-align: right; color: #10B981; font-weight: 500;">-EGP ${discountAmount.toFixed(2)}</td>
                    </tr>
                    ` : ''}
                    <tr style="border-top: 2px solid #E5E7EB;">
                        <td style="padding: 10px 0 5px 0; color: #333333; font-weight: 700; font-size: 16px;">Total:</td>
                        <td style="padding: 10px 0 5px 0; text-align: right; color: #E0A800; font-weight: 700; font-size: 16px;">EGP ${finalTotal.toFixed(2)}</td>
                    </tr>
                    ${payment?.actualPaidAmount ? `
                    <tr>
                        <td style="padding: 5px 0; color: #6B7280;">Amount Paid:</td>
                        <td style="padding: 5px 0; text-align: right; color: #10B981; font-weight: 600;">EGP ${payment.actualPaidAmount.toFixed(2)}</td>
                    </tr>
                    ` : ''}
                </table>
            </div>
            
            <!-- Action Required -->
            ${paymentStatus === 'pending' ? `
            <div style="background-color: #FEF3C7; border: 1px solid #F4B400; border-radius: 12px; padding: 15px; text-align: center;">
                <h4 style="margin: 0 0 8px 0; color: #E0A800; font-size: 16px; font-weight: 600;">⏳ Action Required</h4>
                <p style="margin: 0; color: #E0A800;">Customer will pay ${paymentMethod} at the counter. Please collect payment before serving.</p>
            </div>
            ` : `
            <div style="background-color: #d1fae5; border: 1px solid #10B981; border-radius: 12px; padding: 15px; text-align: center;">
                <h4 style="margin: 0 0 8px 0; color: #059669; font-size: 16px; font-weight: 600;">✅ Ready to Prepare</h4>
                <p style="margin: 0; color: #059669;">Payment confirmed. You can start preparing this order.</p>
            </div>
            `}
        </div>
        
        <!-- Footer -->
        <div style="background-color: #FFFBEB; padding: 15px; text-align: center; border-top: 1px solid #FEF3C7;">
            <p style="margin: 0; color: #6B7280; font-size: 14px;">
                KROO Mensa Management System | 
                <a href="mailto:cafe@kroo.cc" style="color: #F4B400; text-decoration: none; font-weight: 600;">cafe@kroo.cc</a>
            </p>
        </div>
    </div>
</body>
</html>
            `;
            
            // Send email to cafe and front desk
            const recipients = ['kroo.fd.cc@gmail.com', 'kroo.mensa.cc@gmail.com'];
            // const recipients = ['mohamedallam.tu@gmail.com'];

            
            // Create dynamic subject based on payment method
            let subject = '';
            if (paymentMethod === 'instapay' && paymentStatus === 'complete') {
                subject = `🚀 START NOW - Order #${orderNumber || reference} (InstaPay Paid)`;
            } else if (paymentMethod === 'cash') {
                subject = `⏳ PENDING - Order #${orderNumber || reference} (Cash at Counter)`;
            } else if (paymentMethod === 'card') {
                subject = `⏳ PENDING - Order #${orderNumber || reference} (Card at Counter)`;
            } else {
                subject = `📋 New Order #${orderNumber || reference} (${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)})`;
            }
            
            recipients.forEach(email => {
                try {
                    MailApp.sendEmail({
                        to: email,
                        subject: subject,
                        htmlBody: emailHtml,
                        name: 'KROO Mensa System'
                    });
                    console.log(`Order notification email sent to ${email}`);
                } catch (emailError) {
                    console.error(`Failed to send email to ${email}:`, emailError);
                }
            });
            
            return true;
        } catch (error) {
            console.error('Error sending order notification email:', error);
            return false;
        }
    }

    return {
        getMenuItems,
        addOrderToBuffer,
        submitOrder,
        submitPendingOrder,
        checkIfEmailExists,
        sendOrderNotificationEmail
    }

})

function getMenuItems(order) {
    return KROO_MENSA_APP.getMenuItems(order)
}

function checkIfEmailExists({email}) {
    console.log(email)
    return KROO_MENSA_APP.checkIfEmailExists(email)
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

// === EMAIL TEST FUNCTIONS ===
function testEmailNotification() {
    const testOrder = {
        reference: "ORDER-20241201-12345",
        orderId: "ORDER-20241201-12345",
        orderNumber: "KROO24120112345",
        accountEmail: "testuser@kroo.cc",
        email: "testuser@kroo.cc",
        paymentMethod: "instapay",
        paymentStatus: "complete",
        discount: 10,
        tableNumber: "Table 3",
        timestamp: new Date().toISOString(),
        total: 117,
        items: [
            {
                name: "Cappuccino",
                price: 45,
                quantity: 2
            },
            {
                name: "Chocolate Croissant",
                price: 35,
                quantity: 1
            },
            {
                name: "Green Tea",
                price: 25,
                quantity: 1
            }
        ],
        // Guest order structure
        customer: {
            type: 'guest',
            isGuest: true
        },
        // Payment details structure
        payment: {
            method: 'instapay',
            status: 'complete',
            reference: 'REF-20241201-98765',
            amount: 117,
            isOverpaid: false,
            screenshot: {
                fileId: '1ABC123DEF456GHI789',
                url: 'https://drive.google.com/file/d/1ABC123DEF456GHI789/view',
                uploadTimestamp: new Date().toISOString()
            }
        },
        // Totals structure
        totals: {
            subtotal: 130,
            discount: 13,
            total: 117
        }
    };

    console.log('Testing email notification with order:', testOrder);
    return KROO_MENSA_APP.sendOrderNotificationEmail(testOrder);
}

function testEmailNotificationOverpaid() {
    const testOrder = {
        reference: "ORDER-20241201-67890",
        orderId: "ORDER-20241201-67890",
        orderNumber: "KROO24120167890",
        accountEmail: "premium@kroo.cc",
        email: "premium@kroo.cc",
        paymentMethod: "instapay",
        paymentStatus: "complete",
        discount: 15,
        tableNumber: "Table 7",
        timestamp: new Date().toISOString(),
        total: 85,
        overpaidAmount: 15,
        refundDue: 15,
        items: [
            {
                name: "Karak Tea",
                price: 30,
                quantity: 2
            },
            {
                name: "Baklava",
                price: 40,
                quantity: 1
            }
        ],
        // Authenticated user (not guest)
        customer: {
            type: 'authenticated',
            isGuest: false
        },
        // Payment with overpayment
        payment: {
            method: 'instapay',
            status: 'complete',
            reference: 'REF-20241201-54321',
            amount: 85,
            isOverpaid: true,
            actualPaidAmount: 100,
            overpaidAmount: 15,
            refundDue: 15,
            screenshot: {
                fileId: '1XYZ789ABC123DEF456',
                url: 'https://drive.google.com/file/d/1XYZ789ABC123DEF456/view',
                uploadTimestamp: new Date().toISOString()
            }
        },
        // Totals structure
        totals: {
            subtotal: 100,
            discount: 15,
            total: 85
        }
    };

    console.log('Testing overpaid email notification with order:', testOrder);
    return KROO_MENSA_APP.sendOrderNotificationEmail(testOrder);
}

function testEmailNotificationPending() {
    const testOrder = {
        reference: "ORDER-20241201-11111",
        orderId: "ORDER-20241201-11111",
        orderNumber: "KROO24120111111",
        accountEmail: "student@kroo.edu",
        email: "student@kroo.edu",
        paymentMethod: "cash",
        paymentStatus: "pending",
        discount: 10,
        tableNumber: "Table 1",
        timestamp: new Date().toISOString(),
        total: 63,
        items: [
            {
                name: "Americano",
                price: 40,
                quantity: 1
            },
            {
                name: "Muffin",
                price: 30,
                quantity: 1
            }
        ],
        // Authenticated user
        customer: {
            type: 'authenticated',
            isGuest: false
        },
        // Cash payment (pending)
        payment: {
            method: 'cash',
            status: 'pending',
            reference: null,
            amount: 63
        },
        // Totals structure
        totals: {
            subtotal: 70,
            discount: 7,
            total: 63
        }
    };

    console.log('Testing pending payment email notification with order:', testOrder);
    return KROO_MENSA_APP.sendOrderNotificationEmail(testOrder);
}
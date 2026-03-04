
const ejs = require('ejs')
const path = require('path')


const mailSender = async (templateName, data)=>{
    try {
        const templatePath = path.join(__dirname, "views", templateName )
        const html = await ejs.renderFile(templatePath, data)
        // console.log(html)
        return html
    }
    catch (error){

        console.log("error rendering email", error)
    }
}



module.exports = mailSender
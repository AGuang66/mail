const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');
const { exec } = require('child_process');
require('dotenv').config();

const app = express();
const port = process.env.APP_PORT || 7580;

// 配置SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // 25端口通常不使用SSL
  tls: {
    rejectUnauthorized: false
  }
});

// 中间件
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 发送邮件API
app.post('/send-emails', async (req, res) => {
  const { recipients, subject, content } = req.body;
  
  if (!recipients || !subject || !content) {
    return res.status(400).json({ success: false, message: '请填写所有必填字段' });
  }
  
  const emailList = recipients.split(/[\n,;]+/).map(email => email.trim()).filter(Boolean);
  
  if (emailList.length === 0) {
    return res.status(400).json({ success: false, message: '请提供有效的收件人' });
  }
  
  try {
    const results = [];
    let successCount = 0;
    let failCount = 0;
    
    // 逐个发送邮件
    for (const to of emailList) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to,
          subject,
          html: content
        });
        
        successCount++;
        results.push({ email: to, status: 'success' });
      } catch (error) {
        failCount++;
        results.push({ email: to, status: 'failed', error: error.message });
      }
    }
    
    res.json({
      success: true,
      total: emailList.length,
      success: successCount,
      failed: failCount,
      details: results
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`邮件发送系统运行在 http://localhost:${port}`);
});

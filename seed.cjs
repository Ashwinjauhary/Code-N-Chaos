const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://qzllxplrunhxbsuvnznq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6bGx4cGxydW5oeGJzdXZuem5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MTU2MDIsImV4cCI6MjEwMDk5MTYwMn0.kRuU22-zpK5lGZSrlyBz_x4uxvdRhzyfavqXIdmzmio';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
  const filePath = 'C:\\Users\\ashwi\\.gemini\\antigravity-ide\\scratch\\Round-2\\CODE N CHAOS REGISTRATION FORM (Responses).xlsx';
  
  if (!fs.existsSync(filePath)) {
    console.error("Excel file not found at path:", filePath);
    process.exit(1);
  }

  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON
  const rows = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
  
  console.log(`Found ${rows.length} rows in Excel.`);
  
  const participants = [];
  
  // Format the rows
  for (const row of rows) {
    const email = String(row['Email address'] || '').trim();
    const name = String(row['Student Name'] || '').trim();
    let roll_number = String(row['Roll Number'] || '').trim();
    const classNameFull = String(row['Section '] || '').trim();
    let phone_number = String(row['Contact Number'] || '').trim();
    
    // Clean phone number
    phone_number = phone_number.replace(/\D/g, '');
    
    // Clean roll number (sometimes excel formats as float e.g. 25261102134.0)
    roll_number = roll_number.replace(/\.0$/, '');

    // The excel file combines class and section into "Class" like "BCA 2F"
    // Let's split it if possible
    let className = classNameFull;
    let section = '';
    const parts = classNameFull.split(' ');
    if (parts.length > 1) {
      section = parts.pop();
      className = parts.join(' ');
    }

    if (name && roll_number) {
      participants.push({
        name,
        roll_number,
        email,
        phone_number,
        class: className,
        section
      });
    }
  }

  // Add the explicit user mentioned in the prompt
  // "Ashwin Jauhary 24116002159 9555681211 BCA 3C ashwin2431333@gmail.com"
  participants.push({
    name: 'Ashwin Jauhary',
    roll_number: '24116002159',
    phone_number: '9555681211',
    class: 'BCA',
    section: '3C',
    email: 'ashwin2431333@gmail.com'
  });

  console.log(`Prepared ${participants.length} participants to insert.`);

  let insertedCount = 0;
  for (const p of participants) {
    const { data, error } = await supabase
      .from('participants')
      .insert(p)
      .select();

    if (error) {
      if (error.code === '23505') {
        console.log(`Skipped existing: ${p.roll_number} - ${p.name}`);
      } else {
        console.error(`Error inserting ${p.roll_number}:`, error);
      }
    } else {
      insertedCount++;
    }
  }

  console.log(`Successfully inserted ${insertedCount} new participants.`);
}

seed().catch(console.error);

#!/usr/bin/env node
/**
 * Syntax Checker for HTML inline scripts and JS files
 * Part of NYSOA BTP ERP - Anti-regression tool
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..');

function extractInlineScripts(htmlFile) {
    const content = fs.readFileSync(htmlFile, 'utf-8');
    const scripts = [];
    
    const regex = /<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
        const scriptContent = match[1].trim();
        if (scriptContent && scriptContent.length > 10) {
            scripts.push({
                file: htmlFile,
                content: scriptContent
            });
        }
    }
    
    return scripts;
}

function checkJSFile(file) {
    try {
        const result = spawnSync('node', ['--check', file], {
            encoding: 'utf-8',
            timeout: 10000
        });
        
        return {
            file,
            valid: result.status === 0,
            error: result.status !== 0 ? result.stderr : null
        };
    } catch (e) {
        return { file, valid: false, error: e.message };
    }
}

function main() {
    console.log('🔍 NYSOA BTP - Syntax Checker\n');
    console.log('='.repeat(50) + '\n');
    
    const errors = [];
    
    // Check HTML files
    console.log('📄 Checking HTML inline scripts...\n');
    
    const htmlFiles = fs.readdirSync(PROJECT_ROOT)
        .filter(f => f.endsWith('.html'))
        .map(f => path.join(PROJECT_ROOT, f));
    
    for (const file of htmlFiles) {
        const scripts = extractInlineScripts(file);
        
        for (const script of scripts) {
            const tempFile = `/tmp/inline_${Date.now()}_${Math.random()}.js`;
            fs.writeFileSync(tempFile, script.content);
            
            const result = checkJSFile(tempFile);
            
            if (!result.valid) {
                console.log(`❌ ${path.basename(file)}`);
                console.log(`   ${result.error.split('\n')[0]}`);
                errors.push({ type: 'inline-script', file: path.basename(file), error: result.error });
            } else {
                console.log(`✅ ${path.basename(file)}`);
            }
            
            fs.unlinkSync(tempFile);
        }
    }
    
    // Check JS files
    console.log('\n📄 Checking JS files...\n');
    
    const jsFiles = fs.readdirSync(PROJECT_ROOT)
        .filter(f => f.endsWith('.js') && !f.includes('node_modules') && !f.includes('test-'))
        .map(f => path.join(PROJECT_ROOT, f));
    
    for (const file of jsFiles) {
        const result = checkJSFile(file);
        
        if (!result.valid) {
            console.log(`❌ ${path.basename(file)}`);
            console.log(`   ${result.error.split('\n')[0]}`);
            errors.push({ type: 'js-file', file: path.basename(file), error: result.error });
        } else {
            console.log(`✅ ${path.basename(file)}`);
        }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('\n📊 SUMMARY\n');
    console.log(`   Total errors: ${errors.length}`);
    
    if (errors.length > 0) {
        console.log('\n❌ ERRORS:\n');
        for (const err of errors) {
            console.log(`   ${err.file}: ${err.error.split('\n')[0]}`);
        }
        process.exit(1);
    } else {
        console.log('✅ All files pass syntax check!');
        process.exit(0);
    }
}

main();

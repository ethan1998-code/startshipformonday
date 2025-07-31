#!/usr/bin/env node

// Script de démarrage simplifié pour Starship
console.log('🚀 Démarrage de Starship...');

// Vérifier si on est en mode Socket Mode (développement) ou Next.js (production)
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  console.log('📡 Mode production - Démarrage Next.js server...');
  require('child_process').spawn('npm', ['start'], { stdio: 'inherit' });
} else {
  console.log('🔌 Mode développement - Démarrage Socket Mode...');
  require('./starship.js');
}

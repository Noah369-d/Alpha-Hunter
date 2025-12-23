import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import Dashboard from '../views/Dashboard.vue'
import Strategies from '../views/Strategies.vue'

const routes = [
  {
    path: '/',
    component: AppLayout,
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: Dashboard
      },
      {
        path: 'strategies',
        name: 'Strategies',
        component: Strategies
      },
      {
        path: 'backtest',
        name: 'Backtest',
        component: () => import('../views/Backtest.vue')
      },
      {
        path: 'signals',
        name: 'Signals',
        component: () => import('../views/Signals.vue')
      },
      {
        path: 'alpha-pro',
        name: 'AlphaPro',
        component: () => import('../views/AlphaHunterPro.vue')
      },
      {
        path: 'holo',
        name: 'HoloResonance',
        component: () => import('../views/HoloResonance.vue')
      },
      {
        path: 'risk',
        name: 'Risk',
        component: () => import('../views/Risk.vue')
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('../views/Settings.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router


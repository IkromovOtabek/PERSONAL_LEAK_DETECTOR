import { useQuery } from 'react-query';
import api from '../services/api';

/**
 * Umumiy findings statistika hook'i
 * Barcha sahifalarda bir xil statistika sonlarini ko'rsatish uchun
 */
export function useFindingsStats() {
  const hasToken = !!localStorage.getItem('token');

  // Barcha findings'larni olish (statistika uchun)
  // Backend maksimal limit: 1000, shuning uchun barcha findings'larni olish uchun pagination qilamiz
  const { data: findingsData, isLoading, error } = useQuery(
    'findings-stats',
    async () => {
      try {
        // Avval birinchi batch'ni olamiz (limit=1000)
        const firstResponse = await api.get('/v1/findings/?limit=1000&skip=0');
        
        if (!firstResponse.data) {
          console.warn('Findings stats: Empty response data');
          return { items: [], total: 0, skip: 0, limit: 1000 };
        }
        
        const total = firstResponse.data.total ?? 0;
        let allFindings = firstResponse.data.items || [];
        
        // Agar total 1000 tadan ko'p bo'lsa, qolgan findings'larni ham olamiz
        if (total > 1000) {
          const remainingBatches = Math.ceil((total - 1000) / 1000);
          
          // Qolgan batch'larni parallel ravishda olamiz
          const batchPromises = [];
          for (let i = 1; i <= remainingBatches; i++) {
            const skip = i * 1000;
            batchPromises.push(
              api.get(`/v1/findings/?limit=1000&skip=${skip}`)
                .then(res => res.data?.items || [])
                .catch(err => {
                  console.warn(`Error fetching findings batch ${i}:`, err);
                  return [];
                })
            );
          }
          
          const batchResults = await Promise.all(batchPromises);
          // Barcha batch'larni birlashtiramiz
          allFindings = [...allFindings, ...batchResults.flat()];
        }
        
        return {
          items: allFindings,
          total: total,
          skip: 0,
          limit: total > 1000 ? total : 1000
        };
      } catch (error) {
        // 401, 404 yoki network xatolarini ignore qilamiz
        if (error.response?.status === 401 || error.response?.status === 404 || error.code === 'ERR_NETWORK') {
          console.warn('Findings stats: Auth or network error', error.response?.status || error.code);
          return { items: [], total: 0, skip: 0, limit: 1000 };
        }
        console.error('Error fetching findings stats:', error);
        return { items: [], total: 0, skip: 0, limit: 1000 };
      }
    },
    {
      retry: false,
      refetchOnWindowFocus: true,
      refetchInterval: 30000, // 30 soniyada bir yangilash
      enabled: hasToken,
      staleTime: 10000, // 10 soniya davomida cache'da saqlash
    }
  );

  const findings = findingsData?.items || [];
  const totalFindings = findingsData?.total ?? 0;

  // Statistika hisoblash - barcha findings'lardan
  const stats = {
    // Total: API'dan kelgan total (eng aniq)
    total: totalFindings,
    // Severity bo'yicha hisoblash
    high: findings.filter((f) => f.severity === 'high').length,
    medium: findings.filter((f) => f.severity === 'medium').length,
    low: findings.filter((f) => f.severity === 'low').length,
    unresolved: findings.filter((f) => !f.resolved).length,
    resolved: findings.filter((f) => f.resolved).length,
    phishing: findings.filter((f) => f.type === 'phishing').length,
  };
  
  // Debug uchun (faqat development'da)
  if (process.env.NODE_ENV === 'development' && findingsData) {
    console.log('Findings Stats:', {
      totalFromAPI: totalFindings,
      itemsCount: findings.length,
      stats
    });
  }

  return {
    stats,
    isLoading,
    error,
    findings, // Agar kerak bo'lsa
  };
}


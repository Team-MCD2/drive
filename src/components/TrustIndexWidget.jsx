import React, { useState, useEffect } from 'react';

const reviews = [
  {
    id: 1,
    name: "Erwin Nasrii",
    date: "2025-01-10",
    text: "Toujours rien à redire , parallélisme nickel sur Mazda 3 mps alors qu’elle et vraiment très basse pour monter sur un pont . Et bien ici rien à dire professionnalisme et du très très bon travail comme toujours ! Vous pouvez y aller les yeux fermer !",
    rating: 5,
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocKcAZoxZiN7R1syuTphvbHWSt2C8akM61IC5--0HckKQI0m8A=w80-h80-c-rp-mo-br100"
  },
  {
    id: 2,
    name: "Isa CLT",
    date: "2025-01-08",
    text: "Vraiment très contente de la prestation de Drive pneu. Je me suis présentée sans RDV pour une crevaison lente, j’ai été accueillie avec le sourire, ma voiture a été prise en charge immédiatement. Je suis repartie au bout de 20’, pneu réparé, avec un tarif plus que raisonnable. Je recommande sans réserve.",
    rating: 5,
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocKaEYG2ZW_RvI-Xpo5ujUgYi8EwEnno_Lo30bJ8XB7AROJCYQ=w80-h80-c-rp-mo-br100"
  },
  {
    id: 3,
    name: "Jonathan Sebban",
    date: "2025-01-04",
    text: "Crevaison sur tesla model y ils m'ont mis une mèche le temps de payer j'étais déjà reparti rapide efficace je recommande merci à vous",
    rating: 5,
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocKsx-EbdAwnVOee3hPb1FztCoqvKla_7KPbgR9wBQu7-HPSdQ=w80-h80-c-rp-mo-br100"
  },
  {
    id: 4,
    name: "Jamila Ancely",
    date: "2024-12-20",
    text: "Deux fois que je vais chez Drive Pneu et je ne peux que les recommander ! Travail rapide & soigné. D’ailleurs pour la première fois , j’étais partie chez un concurrent qui m’avait dit que ma roue n’était pas réparable & on m’a conseillé de venir chez Drive pneu . Et bizarrement avec eux , ils m’ont réparé la roue !!!! Merci encore pour votre professionnalisme !",
    rating: 5,
    avatar: "https://lh3.googleusercontent.com/a-/ALV-UjW6uIn35hts1M3K3Bj8QOQAGHcCczqtEW4-HzhlvVnc-9juLeCw=w80-h80-c-rp-mo-br100"
  },
  {
    id: 5,
    name: "Salma Benmansour",
    date: "2024-12-07",
    text: "J'avais besoin de remplacer une vanne EGR et un cardan, et ils ont réussi à tout faire en une seule journée, le tout à un tarif vraiment compétitif ! C’est le meilleur garage que j’aie fréquenté. Ma voiture était chez VL Automobile, à seulement 4 minutes de leur garage, et en un mois, ils n'ont pas pu établir de diagnostic, alors qu'ici, tout était réglé en une journée ! Un grand merci pour votre rapidité et votre accueil ! Je recommande vivement !",
    rating: 5,
    avatar: "https://lh3.googleusercontent.com/a-/ALV-UjXR0aVBUjR6xZVfUlTw-Ahocwqjlim6ZU84rfJ-mNb8Q6kC30UD=w80-h80-c-rp-mo-br100"
  },
  {
    id: 6,
    name: "franck maury",
    date: "2024-11-22",
    text: "Super agréable, J'avais une tige dans le pneu arrière de scenic , le soir, tard, ils ont pu me le faire, alors qu'il était fermé, mais encore là, à discuter avant le week-end. Ils m'ont réparé quand même le pneu malgré l'heure. Super rapide et efficace Merci",
    rating: 5,
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocJ2AjfWe2AcdLVf4gHigqUJw2V6WR23SWsO_Wt69cIge9FAjw=w80-h80-c-rp-mo-br100"
  },
  {
    id: 7,
    name: "Rizou",
    date: "2024-10-24",
    text: "Ce garage nous a été recommandé et de notre côté, nous n’hésitons pas à suggérer à d’autres personnes d’y aller les yeux fermés.Equipe agréable, secrétaire efficace et d'un grand professionnalisme (connaissance du véhicule, démarche administrative) un grand merci",
    rating: 5,
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocJI2KoezGj8ZzFxfmtTGT9liRLlzrkk9tmzsTMyMp63FHog_w=w80-h80-c-rp-mo-br100"
  }
];

export default function TrustIndexWidget() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardsToShow, setCardsToShow] = useState(3);

  // Handle responsive layout
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCardsToShow(1);
      } else if (window.innerWidth < 1024) {
        setCardsToShow(2);
      } else {
        setCardsToShow(3);
      }
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const totalGroups = Math.ceil(reviews.length / cardsToShow);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? totalGroups - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === totalGroups - 1 ? 0 : prev + 1));
  };

  // Auto-play slides every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(timer);
  }, [totalGroups]);

  return (
    <div className="review-carousel-container" style={{
      position: 'relative',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px 40px',
      overflow: 'hidden'
    }}>
      <style>{`
        .review-card {
          background: #fff;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          display: flex;
          flex-direction: column;
          height: 100%;
          border: 1px solid #f0f0f0;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .review-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 35px rgba(0,0,0,0.12);
        }
        .review-header {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
        }
        .review-avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          object-fit: cover;
          margin-right: 15px;
        }
        .review-author {
          display: flex;
          flex-direction: column;
        }
        .review-name {
          font-weight: 700;
          color: #333;
          font-size: 16px;
        }
        .review-date {
          font-size: 13px;
          color: #888;
          margin-top: 2px;
        }
        .review-stars {
          display: flex;
          gap: 2px;
          margin-bottom: 15px;
          color: #FFB800;
        }
        .review-text {
          color: #555;
          line-height: 1.6;
          font-size: 15px;
          flex-grow: 1;
        }
        .google-icon {
          width: 20px;
          height: 20px;
          margin-left: auto;
        }
        .carousel-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: #fff;
          border: 1px solid #eaeaea;
          border-radius: 50%;
          width: 44px;
          height: 44px;
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          z-index: 10;
          transition: all 0.3s ease;
          color: #333;
          font-size: 18px;
        }
        .carousel-btn:hover {
          background: #dd183b;
          color: white;
          border-color: #dd183b;
        }
        .carousel-btn.prev { left: 0; }
        .carousel-btn.next { right: 0; }
        
        .carousel-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 25px;
        }
        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #ccc;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .dot.active {
          background: #dd183b;
          transform: scale(1.2);
        }
      `}</style>

      <div className="carousel-track-wrapper" style={{ overflow: 'hidden' }}>
        <div className="carousel-track" style={{
          display: 'flex',
          transform: `translateX(-${currentIndex * 100}%)`,
          transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
        }}>
          {Array.from({ length: totalGroups }).map((_, groupIndex) => (
            <div key={groupIndex} className="carousel-group" style={{
              display: 'flex',
              minWidth: '100%',
              gap: '20px',
              padding: '10px'
            }}>
              {reviews.slice(groupIndex * cardsToShow, (groupIndex + 1) * cardsToShow).map((review) => (
                <div key={review.id} style={{ flex: `0 0 calc((100% - ${(cardsToShow - 1) * 20}px) / ${cardsToShow})` }}>
                  <div className="review-card">
                    <div className="review-header">
                      <img src={review.avatar} alt={review.name} className="review-avatar" />
                      <div className="review-author">
                        <span className="review-name">{review.name}</span>
                        <span className="review-date">{review.date}</span>
                      </div>
                      <img 
                        src="https://cdn.trustindex.io/assets/platform/Google/icon.svg" 
                        alt="Google" 
                        className="google-icon" 
                      />
                    </div>
                    <div className="review-stars">
                      {[...Array(review.rating)].map((_, i) => (
                        <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                      ))}
                    </div>
                    <div className="review-text">
                      "{review.text}"
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>


    </div>
  );
}

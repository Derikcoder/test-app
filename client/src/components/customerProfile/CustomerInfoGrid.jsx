import PropTypes from 'prop-types';
import { SectionCard } from './shared';

const CustomerInfoGrid = ({ cards }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
    {cards.filter(Boolean).map((card) => (
      <SectionCard key={card.key} title={card.title} icon={card.icon} className={card.className || ''}>
        {card.children}
      </SectionCard>
    ))}
  </div>
);

CustomerInfoGrid.propTypes = {
  cards: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      title: PropTypes.string.isRequired,
      icon: PropTypes.string,
      className: PropTypes.string,
      children: PropTypes.node,
    })
  ),
};

CustomerInfoGrid.defaultProps = {
  cards: [],
};

export default CustomerInfoGrid;

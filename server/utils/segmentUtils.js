// Helper function to build SQL query from rules
function buildSegmentQuery(rules) {
  let whereClause = '';
  let params = [];

  function processRule(rule, isFirst = true) {
    if (rule.operator === 'AND' || rule.operator === 'OR') {
      const conditions = rule.conditions.map((condition, index) => 
        processRule(condition, index === 0)
      ).filter(Boolean);
      
      if (conditions.length > 0) {
        return `(${conditions.join(` ${rule.operator} `)})`;
      }
      return '';
    }

    // Handle individual conditions
    const { field, operator, value } = rule;
    
    if (!field || !operator || value === undefined) {
      return '';
    }

    let condition = '';
    
    switch (field) {
      case 'total_spent':
        switch (operator) {
          case 'greater_than':
            condition = 'total_spent > ?';
            params.push(parseFloat(value));
            break;
          case 'less_than':
            condition = 'total_spent < ?';
            params.push(parseFloat(value));
            break;
          case 'equals':
            condition = 'total_spent = ?';
            params.push(parseFloat(value));
            break;
          case 'between':
            condition = 'total_spent BETWEEN ? AND ?';
            params.push(parseFloat(value.min), parseFloat(value.max));
            break;
        }
        break;
        
      case 'total_orders':
        switch (operator) {
          case 'greater_than':
            condition = 'total_orders > ?';
            params.push(parseInt(value));
            break;
          case 'less_than':
            condition = 'total_orders < ?';
            params.push(parseInt(value));
            break;
          case 'equals':
            condition = 'total_orders = ?';
            params.push(parseInt(value));
            break;
        }
        break;
        
      case 'last_visit':
        switch (operator) {
          case 'days_ago':
            condition = 'last_visit < DATE_SUB(NOW(), INTERVAL ? DAY)';
            params.push(parseInt(value));
            break;
          case 'within_days':
            condition = 'last_visit >= DATE_SUB(NOW(), INTERVAL ? DAY)';
            params.push(parseInt(value));
            break;
          case 'is_null':
            condition = 'last_visit IS NULL';
            break;
        }
        break;
        
      case 'status':
        switch (operator) {
          case 'equals':
            condition = 'status = ?';
            params.push(value);
            break;
          case 'not_equals':
            condition = 'status != ?';
            params.push(value);
            break;
        }
        break;
        
      case 'registration_date':
        switch (operator) {
          case 'after':
            condition = 'registration_date > ?';
            params.push(value);
            break;
          case 'before':
            condition = 'registration_date < ?';
            params.push(value);
            break;
          case 'between':
            condition = 'registration_date BETWEEN ? AND ?';
            params.push(value.start, value.end);
            break;
        }
        break;
    }

    return condition;
  }

  whereClause = processRule(rules);
  
  return {
    query: whereClause,
    params: params
  };
}

module.exports = {
  buildSegmentQuery
};
